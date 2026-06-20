/**
 * Session-consumption math (plan §7/§8). A package's remaining sessions are
 * computed, never stored: every non-cancelled booking linked to the package
 * consumes one session (`no_show` consumes, same as `completed`; only
 * `cancelled` frees it back). Pure functions — unit-tested in the Vitest suite.
 */
import type { BookingStatus } from "@/generated/prisma/enums";

/** Does a booking in this status consume a session from its package? */
export function isConsuming(status: BookingStatus): boolean {
  return status !== "cancelled";
}

/** How many sessions the given bookings consume. */
export function consumedSessions(statuses: BookingStatus[]): number {
  return statuses.filter(isConsuming).length;
}

/** Sessions left on a package: total minus consumed (clamped at 0). */
export function sessionsRemaining(
  total: number,
  statuses: BookingStatus[],
): number {
  return Math.max(0, total - consumedSessions(statuses));
}

/** True when the package has no sessions left (booking against it is blocked). */
export function isExhausted(total: number, statuses: BookingStatus[]): boolean {
  return sessionsRemaining(total, statuses) <= 0;
}
