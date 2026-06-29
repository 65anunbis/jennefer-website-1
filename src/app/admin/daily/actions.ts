"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import type { BookingStatus } from "@/generated/prisma/enums";

/** The three terminal outcomes a `confirmed` booking can be resolved to. */
const OUTCOMES: BookingStatus[] = ["completed", "cancelled", "no_show"];

/**
 * Resolve a `confirmed` booking to completed / cancelled / no_show (the EOD/SOD
 * "awaiting an outcome" action, plan §7). No-ops if the booking is missing or
 * already resolved (so a double-tap or a stale page can't reopen it); the row
 * just drops off on the next load.
 */
export async function resolveOutcome(
  bookingId: number,
  status: BookingStatus,
): Promise<void> {
  await requireUser();
  if (!OUTCOMES.includes(status)) return;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "confirmed") {
    revalidatePath("/admin/daily");
    return;
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { status } });
  await recordAudit("update", "booking", bookingId, "Updated: status");

  revalidatePath("/admin/daily");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

/**
 * Stamp a booking's `reminderSentAt` so the day-before reminder drops off the
 * daily list (the one-tap reminder action, plan §7/§11). The wa.me message is
 * opened client-side; this records that we acted. Idempotent.
 */
export async function markReminderSent(bookingId: number): Promise<void> {
  await requireUser();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.reminderSentAt !== null) {
    revalidatePath("/admin/daily");
    return;
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { reminderSentAt: new Date() },
  });
  await recordAudit("update", "booking", bookingId, "Sent day-before reminder");

  revalidatePath("/admin/daily");
}

/**
 * Mark an exhausted package completed (the manual "Mark completed" action, plan
 * §7 — kept manual, not auto-flipped). Only acts on an `active` package.
 */
export async function markPackageCompleted(packageId: number): Promise<void> {
  await requireUser();

  const pkg = await prisma.clientPackage.findUnique({ where: { id: packageId } });
  if (!pkg || pkg.status !== "active") {
    revalidatePath("/admin/daily");
    return;
  }

  await prisma.clientPackage.update({
    where: { id: packageId },
    data: { status: "completed" },
  });
  await recordAudit("update", "client_package", packageId, "Updated: status");

  revalidatePath("/admin/daily");
  revalidatePath(`/admin/clients/${pkg.clientId}`);
  revalidatePath("/admin/clients");
}
