/**
 * Display formatting for dates/times (plan decision 2026-06-20: the admin UI
 * shows times in SGT with an explicit "SGT" label; Prisma keeps storing UTC).
 *
 * `@db.Date` and `@db.Time` values come back as Dates whose UTC fields hold the
 * intended wall-clock (the seed/actions store them that way), so we read with
 * the getUTC* accessors. Pure functions — unit-tested in the Vitest suite.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** A @db.Date value → "8 May 2026". */
export function formatDateSGT(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** A @db.Time value → "10:00" (24-hour, no label). */
export function formatTimeSGT(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** A booking's date + time → "8 May 2026, 10:00 SGT". */
export function formatDateTimeSGT(date: Date, time: Date): string {
  return `${formatDateSGT(date)}, ${formatTimeSGT(time)} SGT`;
}

/** Today's date in SGT as "YYYY-MM-DD" (for date-input defaults). */
export function todaySGT(now: Date = new Date()): string {
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return `${sgt.getUTCFullYear()}-${pad(sgt.getUTCMonth() + 1)}-${pad(sgt.getUTCDate())}`;
}
