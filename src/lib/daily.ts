/**
 * Daily-processing (EOD/SOD) section logic — plan §7. The `/admin/daily` page
 * runs the Prisma queries and feeds plain row shapes in; these PURE functions
 * classify them into the page's sections, compute each row's deep-link href and
 * display label, and reuse the overlap/sessions math. No Prisma, no I/O — fully
 * unit-testable in the Vitest suite (4.6).
 *
 * Date inputs are the `@db.Date`/`@db.Time` values as Prisma returns them
 * (UTC wall-clock; read via the getUTC* accessors inside the helpers we reuse),
 * so callers pass them straight through. Outputs are plain/serializable so they
 * cross the server→client boundary cleanly.
 */
import type { BookingStatus, ClientPackageStatus } from "@/generated/prisma/enums";
import { formatDateSGT, formatDateTimeSGT, todaySGT } from "./datetime";
import { isoOfDate } from "./calendar";
import { minutesOfTime, rangesOverlap, type Interval } from "./overlap";
import { sessionsRemaining } from "./sessions";

/** "YYYY-MM-DD" for tomorrow in SGT (UTC+8, no DST — a flat +24h is safe). */
export function tomorrowSGT(now: Date = new Date()): string {
  return todaySGT(new Date(now.getTime() + 24 * 60 * 60 * 1000));
}

// ── Section 1: bookings awaiting an outcome (today + overdue) ────────────────

export type OutcomeInput = {
  id: number;
  clientName: string;
  scheduledDate: Date;
  scheduledTime: Date;
  status: BookingStatus;
};

export type OutcomeItem = {
  id: number;
  clientName: string;
  whenLabel: string;
  overdue: boolean;
  href: string;
};

/**
 * `confirmed` bookings on or before today, awaiting completed/cancelled/no_show.
 * Today's rows are the EOD work; earlier rows are the overdue backlog (the SOD
 * safety net). Oldest first so the longest-outstanding sit at the top.
 */
export function bookingsAwaitingOutcome(
  bookings: OutcomeInput[],
  now: Date = new Date(),
): OutcomeItem[] {
  const today = todaySGT(now);
  return bookings
    .filter(
      (b) => b.status === "confirmed" && isoOfDate(b.scheduledDate) <= today,
    )
    .sort(
      (a, b) =>
        isoOfDate(a.scheduledDate).localeCompare(isoOfDate(b.scheduledDate)) ||
        minutesOfTime(a.scheduledTime) - minutesOfTime(b.scheduledTime),
    )
    .map((b) => ({
      id: b.id,
      clientName: b.clientName,
      whenLabel: formatDateTimeSGT(b.scheduledDate, b.scheduledTime),
      overdue: isoOfDate(b.scheduledDate) < today,
      href: `/admin/bookings/${b.id}`,
    }));
}

// ── Section 2: send tomorrow's reminders (SOD) ──────────────────────────────

export type ReminderInput = {
  id: number;
  clientName: string;
  scheduledDate: Date;
  scheduledTime: Date;
  status: BookingStatus;
  reminderSentAt: Date | null;
  /** Stored WhatsApp number (digits + country code, no `+`) — wa.me form. */
  whatsapp: string;
  /** Reminder text, pre-built by the page via bookingMessage("reminder", …). */
  message: string;
};

export type ReminderItem = {
  id: number;
  clientName: string;
  whenLabel: string;
  waUrl: string;
  href: string;
};

/**
 * Tomorrow's `confirmed` bookings that haven't had a reminder sent yet. The
 * one-tap action opens this `waUrl` AND stamps `reminderSentAt` (server side),
 * so a sent row drops off on the next load. Earliest first.
 */
export function remindersDue(
  bookings: ReminderInput[],
  now: Date = new Date(),
): ReminderItem[] {
  const tomorrow = tomorrowSGT(now);
  return bookings
    .filter(
      (b) =>
        b.status === "confirmed" &&
        b.reminderSentAt === null &&
        isoOfDate(b.scheduledDate) === tomorrow,
    )
    .sort((a, b) => minutesOfTime(a.scheduledTime) - minutesOfTime(b.scheduledTime))
    .map((b) => ({
      id: b.id,
      clientName: b.clientName,
      whenLabel: formatDateTimeSGT(b.scheduledDate, b.scheduledTime),
      waUrl: `https://wa.me/${b.whatsapp}?text=${encodeURIComponent(b.message)}`,
      href: `/admin/bookings/${b.id}`,
    }));
}

// ── Section 3: upcoming collisions (SOD) ────────────────────────────────────

export type CollisionBooking = {
  id: number;
  scheduledDate: Date;
  scheduledTime: Date;
  durationMinutes: number;
  status: BookingStatus;
};

export type CollisionBlock = {
  id: number;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  startTime: Date | null;
  endTime: Date | null;
};

export type CollisionItem = {
  dateIso: string;
  dateLabel: string;
  count: number; // distinct bookings involved in a clash that day
  label: string;
  href: string;
};

type Span = Interval & { isBlock: boolean };

/** The minute interval a block occupies on a given date (same rule as the day view). */
function blockSpanOn(blk: CollisionBlock, iso: string): Span | null {
  if (isoOfDate(blk.startDate) > iso || isoOfDate(blk.endDate) < iso) return null;
  if (!blk.allDay && isoOfDate(blk.startDate) === iso && blk.startTime && blk.endTime) {
    return {
      isBlock: true,
      startMin: minutesOfTime(blk.startTime),
      endMin: minutesOfTime(blk.endTime),
    };
  }
  return { isBlock: true, startMin: 0, endMin: 1440 }; // all-day / spanned day
}

/**
 * Upcoming dates (>= today) where two non-cancelled bookings overlap, or a
 * booking overlaps a calendar block. One row per date → the day view to fix it.
 * Block-vs-block overlaps are ignored (not an actionable booking clash).
 */
export function findCollisions(
  bookings: CollisionBooking[],
  blocks: CollisionBlock[],
  now: Date = new Date(),
): CollisionItem[] {
  const today = todaySGT(now);

  const byDate = new Map<string, CollisionBooking[]>();
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const iso = isoOfDate(b.scheduledDate);
    if (iso < today) continue;
    const list = byDate.get(iso);
    if (list) list.push(b);
    else byDate.set(iso, [b]);
  }

  const items: CollisionItem[] = [];
  for (const iso of Array.from(byDate.keys()).sort()) {
    const dayBookings = byDate.get(iso)!;
    const spans: (Span & { bookingId: number | null })[] = dayBookings.map((b) => ({
      isBlock: false,
      bookingId: b.id,
      startMin: minutesOfTime(b.scheduledTime),
      endMin: minutesOfTime(b.scheduledTime) + b.durationMinutes,
    }));
    for (const blk of blocks) {
      const span = blockSpanOn(blk, iso);
      if (span) spans.push({ ...span, bookingId: null });
    }

    const colliding = new Set<number>();
    let blockInvolved = false;
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const a = spans[i];
        const b = spans[j];
        if (a.isBlock && b.isBlock) continue; // ignore block×block
        if (!rangesOverlap(a, b)) continue;
        if (a.bookingId !== null) colliding.add(a.bookingId);
        if (b.bookingId !== null) colliding.add(b.bookingId);
        if (a.isBlock || b.isBlock) blockInvolved = true;
      }
    }

    if (colliding.size > 0) {
      const n = colliding.size;
      const label =
        blockInvolved && n === 1
          ? "Booking clashes with a calendar block"
          : blockInvolved
            ? `${n} bookings clash (calendar block involved)`
            : `${n} bookings clash`;
      items.push({
        dateIso: iso,
        dateLabel: formatDateSGT(new Date(`${iso}T00:00:00.000Z`)),
        count: n,
        label,
        href: `/admin/bookings/day/${iso}`,
      });
    }
  }
  return items;
}

// ── Section 4: completed sessions missing a note (admin-only) ───────────────

export type MissingNoteInput = {
  id: number;
  clientId: number;
  clientName: string;
  scheduledDate: Date;
  scheduledTime: Date;
  status: BookingStatus;
  hasNote: boolean;
};

export type MissingNoteItem = {
  id: number;
  clientName: string;
  whenLabel: string;
  href: string;
};

/** `completed` bookings with no session note yet → the client's add-note page. */
export function sessionsMissingNotes(
  bookings: MissingNoteInput[],
): MissingNoteItem[] {
  return bookings
    .filter((b) => b.status === "completed" && !b.hasNote)
    .sort(
      (a, b) =>
        isoOfDate(b.scheduledDate).localeCompare(isoOfDate(a.scheduledDate)) ||
        minutesOfTime(b.scheduledTime) - minutesOfTime(a.scheduledTime),
    )
    .map((b) => ({
      id: b.id,
      clientName: b.clientName,
      whenLabel: formatDateTimeSGT(b.scheduledDate, b.scheduledTime),
      href: `/admin/clients/${b.clientId}/notes/new`,
    }));
}

// ── Package-derived sections (5, 6, 7) share one input shape ─────────────────

export type PackageInput = {
  id: number;
  clientId: number;
  clientName: string;
  packageName: string;
  sessionsTotal: number;
  /** Statuses of bookings linked to this package (drives sessions_remaining). */
  bookingStatuses: BookingStatus[];
  status: ClientPackageStatus;
  paid: boolean;
  pricePaidSgd: number;
};

const remainingOf = (p: PackageInput) =>
  sessionsRemaining(p.sessionsTotal, p.bookingStatuses);

const money = (n: number) =>
  `$${n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Section 5: exhausted packages to close (manual Mark completed) ───────────

export type CloseItem = {
  packageId: number;
  clientId: number;
  clientName: string;
  packageName: string;
  href: string;
};

/** `active` packages with 0 sessions left — surface to mark completed by hand. */
export function packagesToClose(packages: PackageInput[]): CloseItem[] {
  return packages
    .filter((p) => p.status === "active" && remainingOf(p) === 0)
    .map((p) => ({
      packageId: p.id,
      clientId: p.clientId,
      clientName: p.clientName,
      packageName: p.packageName,
      href: `/admin/clients/${p.clientId}/packages/${p.id}`,
    }));
}

// ── Section 6: clients with unused sessions but no upcoming booking ──────────

export type RebookItem = {
  clientId: number;
  clientName: string;
  remaining: number; // total sessions left across the client's active packages
  href: string;
};

/**
 * One row per client who has sessions left on an `active` package but no future
 * `confirmed` booking (includes a brand-new package not yet booked). Pass the
 * set of client IDs that DO have an upcoming booking to exclude them.
 */
export function clientsToRebook(
  packages: PackageInput[],
  clientIdsWithUpcoming: Set<number>,
): RebookItem[] {
  const byClient = new Map<number, { name: string; remaining: number }>();
  for (const p of packages) {
    if (p.status !== "active") continue;
    const left = remainingOf(p);
    if (left <= 0) continue;
    if (clientIdsWithUpcoming.has(p.clientId)) continue;
    const acc = byClient.get(p.clientId);
    if (acc) acc.remaining += left;
    else byClient.set(p.clientId, { name: p.clientName, remaining: left });
  }
  return Array.from(byClient.entries())
    .map(([clientId, { name, remaining }]) => ({
      clientId,
      clientName: name,
      remaining,
      href: `/admin/clients/${clientId}`,
    }))
    .sort((a, b) => a.clientName.localeCompare(b.clientName));
}

// ── Section 7: unpaid packages ──────────────────────────────────────────────

export type UnpaidItem = {
  packageId: number;
  clientId: number;
  clientName: string;
  packageName: string;
  amountLabel: string;
  href: string;
};

/** Non-cancelled packages not yet marked paid → the package page to follow up. */
export function unpaidPackages(packages: PackageInput[]): UnpaidItem[] {
  return packages
    .filter((p) => !p.paid && p.status !== "cancelled")
    .map((p) => ({
      packageId: p.id,
      clientId: p.clientId,
      clientName: p.clientName,
      packageName: p.packageName,
      amountLabel: money(p.pricePaidSgd),
      href: `/admin/clients/${p.clientId}/packages/${p.id}`,
    }));
}
