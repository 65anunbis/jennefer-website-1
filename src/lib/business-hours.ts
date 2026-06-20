/**
 * Business-hours interval helpers (plan §8). The weekly schedule is a set of
 * open intervals; an interval is uniquely identified by (day, start, end), so
 * saving is a set-difference sync — we only delete removed intervals and insert
 * added ones, leaving unchanged rows (and their created_at) alone. Pure
 * functions — unit-tested in the Vitest suite.
 */

export type IntervalMinutes = {
  dayOfWeek: number; // 0=Sun … 6=Sat
  startMin: number; // minutes since midnight
  endMin: number;
};

/** Parse "HH:MM" → minutes since midnight, or null if malformed/out of range. */
export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Stable identity of an interval. */
export function intervalKey(i: IntervalMinutes): string {
  return `${i.dayOfWeek}|${i.startMin}|${i.endMin}`;
}

/**
 * Compute the minimal change between the stored intervals and the desired set:
 * which existing rows to delete and which new intervals to insert. Intervals
 * present in both are left untouched (preserving created_at / id).
 */
export function diffIntervals<T extends IntervalMinutes & { id: number }>(
  existing: T[],
  desired: IntervalMinutes[],
): { toDeleteIds: number[]; toInsert: IntervalMinutes[] } {
  const desiredKeys = new Set(desired.map(intervalKey));
  const existingKeys = new Set(existing.map(intervalKey));

  const toDeleteIds = existing
    .filter((r) => !desiredKeys.has(intervalKey(r)))
    .map((r) => r.id);
  const toInsert = desired.filter((d) => !existingKeys.has(intervalKey(d)));

  return { toDeleteIds, toInsert };
}
