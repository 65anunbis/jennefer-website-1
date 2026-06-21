/**
 * Booking/​block overlap math (plan §7, "inline overlap warning" + MIDNIGHT
 * RULE). A booking occupies the half-open minute interval
 * [start, start + duration) on its `scheduled_date`, keyed off its START time:
 * a session starting 23:00–23:59 belongs to that date and is NOT wrapped across
 * midnight into the next day. Overlap is therefore only ever compared between
 * items sharing the same date — the caller groups by date (so a 23:30+60 booking
 * and a 00:15 booking the next day never meet here), and these pure functions
 * just do the interval arithmetic. Unit-tested in the Vitest suite (4.6).
 */

export type Interval = { startMin: number; endMin: number };

/** Minutes since midnight for a `@db.Time` value (stored UTC wall-clock). */
export function minutesOfTime(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

/**
 * The interval a booking occupies. May exceed 1440 (e.g. 23:30 + 60 → 1410–1470)
 * — that's fine: we never compare across dates, so there is no midnight wrap.
 */
export function bookingInterval(startMin: number, durationMinutes: number): Interval {
  return { startMin, endMin: startMin + durationMinutes };
}

/** Do two half-open intervals overlap? Touching at an edge does NOT overlap. */
export function rangesOverlap(a: Interval, b: Interval): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/**
 * Of the `existing` intervals on the SAME date, which overlap `candidate`?
 * Returns their indices (so the caller can map back to bookings/blocks for the
 * warning text). An all-day block is represented as the full-day interval
 * {0, 1440} by the caller, so it overlaps any timed session.
 */
export function overlappingIndices(
  candidate: Interval,
  existing: Interval[],
): number[] {
  const hits: number[] = [];
  existing.forEach((iv, i) => {
    if (rangesOverlap(candidate, iv)) hits.push(i);
  });
  return hits;
}
