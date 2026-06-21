"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { syncBookingToGcal, type GcalEventPayload } from "@/lib/gcal";
import {
  bookingInterval,
  minutesOfTime,
  overlappingIndices,
  type Interval,
} from "@/lib/overlap";
import { formatTimeSGT } from "@/lib/datetime";
import type { DeliveryType, BookingStatus } from "@/generated/prisma/enums";

export type FormState = { error?: string; overlapWarning?: string };

const DELIVERY_TYPES: DeliveryType[] = ["in_person", "zoom"];
const BOOKING_STATUSES: BookingStatus[] = [
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];
const ZOOM_DEFAULT = "to arrange manually";

/** Parse a "YYYY-MM-DD" date input into a UTC-midnight Date (for @db.Date). */
function parseDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse "HH:MM" → a @db.Time value (epoch date, UTC), or null if malformed. */
function parseTime(v: FormDataEntryValue | null): Date | null {
  const m = /^(\d{2}):(\d{2})$/.exec(String(v ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return new Date(Date.UTC(1970, 0, 1, h, min, 0));
}

type BookingInput = {
  clientId: number;
  clientPackageId: number | null;
  deliveryType: DeliveryType;
  venueId: number | null;
  zoomJoinUrl: string | null;
  scheduledDate: Date;
  scheduledTime: Date;
  durationMinutes: number;
  status: BookingStatus;
  bookingNotes: string | null;
};

/**
 * Validate + normalize the form into a BookingInput. Enforces the delivery XOR
 * (in_person ⇒ venue, no zoom url; zoom ⇒ zoom url, no venue) to match the DB
 * CHECK constraint, and the exhausted-package hard block. `excludeBookingId` is
 * the booking being edited (excluded from its package's consumption count so it
 * doesn't block reusing its own session).
 */
async function readInput(
  formData: FormData,
  isEdit: boolean,
  excludeBookingId: number | null,
): Promise<{ ok: true; value: BookingInput } | { ok: false; error: string }> {
  const clientId = Number(String(formData.get("clientId") ?? "").trim());
  if (!Number.isInteger(clientId) || clientId <= 0)
    return { ok: false, error: "Please choose a client." };
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Selected client no longer exists." };

  // Status: a new booking is always `confirmed`; edits may set any outcome.
  let status: BookingStatus = "confirmed";
  if (isEdit) {
    const statusRaw = String(formData.get("status") ?? "");
    if (!BOOKING_STATUSES.includes(statusRaw as BookingStatus))
      return { ok: false, error: "Please choose a valid status." };
    status = statusRaw as BookingStatus;
  }
  const willConsume = status !== "cancelled";

  // Package (optional — blank = ad-hoc).
  let clientPackageId: number | null = null;
  const pkgRaw = String(formData.get("clientPackageId") ?? "").trim();
  if (pkgRaw !== "") {
    clientPackageId = Number(pkgRaw);
    if (!Number.isInteger(clientPackageId))
      return { ok: false, error: "Invalid package." };
    const pkg = await prisma.clientPackage.findUnique({
      where: { id: clientPackageId },
      include: { package: { include: { service: true } } },
    });
    if (!pkg) return { ok: false, error: "Selected package no longer exists." };
    if (pkg.clientId !== clientId)
      return { ok: false, error: "That package belongs to a different client." };

    // Hard-block booking against an exhausted package (plan §7). Count
    // non-cancelled bookings already consuming it, excluding this one on edit.
    if (willConsume) {
      const consumedByOthers = await prisma.booking.count({
        where: {
          clientPackageId,
          status: { not: "cancelled" },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
      });
      if (pkg.sessionsTotal - consumedByOthers <= 0)
        return {
          ok: false,
          error: `That package has no sessions left (${pkg.package.service.name} — ${pkg.package.name}). Pick another package or book ad-hoc.`,
        };
    }
  }

  // Delivery XOR.
  const deliveryRaw = String(formData.get("deliveryType") ?? "");
  if (!DELIVERY_TYPES.includes(deliveryRaw as DeliveryType))
    return { ok: false, error: "Please choose a delivery type." };
  const deliveryType = deliveryRaw as DeliveryType;

  let venueId: number | null = null;
  let zoomJoinUrl: string | null = null;
  if (deliveryType === "in_person") {
    const venueRaw = String(formData.get("venueId") ?? "").trim();
    venueId = Number(venueRaw);
    if (!venueRaw || !Number.isInteger(venueId))
      return { ok: false, error: "An in-person booking needs a venue." };
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) return { ok: false, error: "Selected venue no longer exists." };
  } else {
    const urlRaw = String(formData.get("zoomJoinUrl") ?? "").trim();
    zoomJoinUrl = urlRaw || ZOOM_DEFAULT;
  }

  // When / how long.
  const scheduledDate = parseDate(formData.get("scheduledDate"));
  const scheduledTime = parseTime(formData.get("scheduledTime"));
  if (!scheduledDate)
    return { ok: false, error: "A valid date is required." };
  if (!scheduledTime)
    return { ok: false, error: "A valid start time is required." };

  const durationMinutes = Number(
    String(formData.get("durationMinutes") ?? "").trim(),
  );
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0)
    return { ok: false, error: "Duration must be a whole number of minutes." };
  if (durationMinutes > 600)
    return { ok: false, error: "Duration looks too long (max 600 minutes)." };

  const bookingNotes = String(formData.get("bookingNotes") ?? "").trim();

  return {
    ok: true,
    value: {
      clientId,
      clientPackageId,
      deliveryType,
      venueId,
      zoomJoinUrl,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      status,
      bookingNotes: bookingNotes || null,
    },
  };
}

/**
 * Soft overlap check (plan §7). Returns a human warning string if the candidate
 * booking overlaps another non-cancelled booking or a block on the same date,
 * else null. Cancelled bookings don't occupy time, so they never warn.
 */
async function overlapWarningFor(
  v: BookingInput,
  excludeBookingId: number | null,
): Promise<string | null> {
  if (v.status === "cancelled") return null;

  const candidate = bookingInterval(
    minutesOfTime(v.scheduledTime),
    v.durationMinutes,
  );

  // Other bookings on the same date.
  const others = await prisma.booking.findMany({
    where: {
      scheduledDate: v.scheduledDate,
      status: { not: "cancelled" },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    include: { client: { select: { name: true } } },
  });

  // Blocks whose span covers this date.
  const blocks = await prisma.calendarBlock.findMany({
    where: {
      startDate: { lte: v.scheduledDate },
      endDate: { gte: v.scheduledDate },
    },
  });

  const labels: string[] = [];
  const intervals: Interval[] = [];

  for (const b of others) {
    intervals.push(bookingInterval(minutesOfTime(b.scheduledTime), b.durationMinutes));
    labels.push(
      `${formatTimeSGT(b.scheduledTime)} ${b.client.name}`,
    );
  }
  for (const blk of blocks) {
    // All-day (or a middle day of a multi-day span) → occupies the whole day.
    const sameStart = blk.startDate.getTime() === v.scheduledDate.getTime();
    const timed = !blk.allDay && blk.startTime && blk.endTime && sameStart;
    if (timed) {
      intervals.push({
        startMin: minutesOfTime(blk.startTime!),
        endMin: minutesOfTime(blk.endTime!),
      });
    } else {
      intervals.push({ startMin: 0, endMin: 24 * 60 });
    }
    labels.push(`block "${blk.title}"`);
  }

  const hits = overlappingIndices(candidate, intervals);
  if (hits.length === 0) return null;
  return `Overlaps ${hits.map((i) => labels[i]).join(", ")}.`;
}

function gcalPayload(v: BookingInput, clientName: string, venueName: string | null): GcalEventPayload {
  const env = process.env.GCAL_ENV_PREFIX ?? "";
  return {
    summary: `${env}${clientName}`,
    location:
      v.deliveryType === "in_person"
        ? venueName ?? undefined
        : v.zoomJoinUrl ?? undefined,
    date: v.scheduledDate.toISOString().slice(0, 10),
    startTime: formatTimeSGT(v.scheduledTime),
    durationMinutes: v.durationMinutes,
  };
}

export async function createBooking(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = await readInput(formData, false, null);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  // Soft overlap: warn once, let the user acknowledge to override.
  if (formData.get("acknowledgeOverlap") !== "on") {
    const warning = await overlapWarningFor(v, null);
    if (warning) return { overlapWarning: warning };
  }

  const created = await prisma.booking.create({ data: v });

  const venue = v.venueId
    ? await prisma.venue.findUnique({ where: { id: v.venueId }, select: { name: true } })
    : null;
  const client = await prisma.client.findUnique({
    where: { id: v.clientId },
    select: { name: true },
  });
  const eventId = await syncBookingToGcal({
    bookingId: created.id,
    operation: "create",
    existingEventId: null,
    payload: gcalPayload(v, client?.name ?? "Client", venue?.name ?? null),
  });
  if (eventId) {
    await prisma.booking.update({
      where: { id: created.id },
      data: { gcalEventId: eventId },
    });
  }

  await recordAudit("create", "booking", created.id, "Created booking");
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings");
}

export async function updateBooking(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const target = await prisma.booking.findUnique({ where: { id } });
  if (!target) return { error: "Booking not found." };

  const parsed = await readInput(formData, true, id);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  if (formData.get("acknowledgeOverlap") !== "on") {
    const warning = await overlapWarningFor(v, id);
    if (warning) return { overlapWarning: warning };
  }

  const changed: string[] = [];
  if (v.clientId !== target.clientId) changed.push("client_id");
  if (v.clientPackageId !== target.clientPackageId) changed.push("client_package_id");
  if (v.deliveryType !== target.deliveryType) changed.push("delivery_type");
  if (v.venueId !== target.venueId) changed.push("venue_id");
  if (v.zoomJoinUrl !== target.zoomJoinUrl) changed.push("zoom_join_url");
  if (v.scheduledDate.getTime() !== target.scheduledDate.getTime())
    changed.push("scheduled_date");
  if (v.scheduledTime.getTime() !== target.scheduledTime.getTime())
    changed.push("scheduled_time");
  if (v.durationMinutes !== target.durationMinutes) changed.push("duration_minutes");
  if (v.status !== target.status) changed.push("status");
  if (v.bookingNotes !== target.bookingNotes) changed.push("booking_notes");

  await prisma.booking.update({ where: { id }, data: v });

  const venue = v.venueId
    ? await prisma.venue.findUnique({ where: { id: v.venueId }, select: { name: true } })
    : null;
  const client = await prisma.client.findUnique({
    where: { id: v.clientId },
    select: { name: true },
  });
  await syncBookingToGcal({
    bookingId: id,
    operation: "update",
    existingEventId: target.gcalEventId,
    payload: gcalPayload(v, client?.name ?? "Client", venue?.name ?? null),
  });

  await recordAudit(
    "update",
    "booking",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings");
}

export async function deleteBooking(id: number): Promise<void> {
  await requireUser();

  const target = await prisma.booking.findUnique({ where: { id } });
  if (target) {
    await prisma.booking.delete({ where: { id } });
    await syncBookingToGcal({
      bookingId: id,
      operation: "delete",
      existingEventId: target.gcalEventId,
      payload: null,
    });
    await recordAudit("delete", "booking", id, "Deleted booking");
  }
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings");
}
