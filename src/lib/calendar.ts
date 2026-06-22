/**
 * Month-grid helpers for the admin Bookings calendar (plan §7). All date math
 * is done in UTC because `@db.Date` values are stored as UTC-midnight wall-clock
 * (SGT calendar date), so a cell's `iso` compares directly against a booking's
 * `scheduledDate.toISOString().slice(0,10)`. Pure functions — unit-tested in 4.6.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Monday-first weekday headers (matches the business-hours editor ordering). */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (n: number) => String(n).padStart(2, "0");

export type YearMonth = { year: number; month: number }; // month is 1-12

export type MonthCell = {
  iso: string; // "YYYY-MM-DD"
  day: number; // day-of-month
  inMonth: boolean; // false for leading/trailing days of adjacent months
  dow: number; // 0=Sun … 6=Sat (matches business_hours.day_of_week)
};

/** The current month in SGT (UTC+8). */
export function currentMonthSGT(now: Date = new Date()): YearMonth {
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return { year: sgt.getUTCFullYear(), month: sgt.getUTCMonth() + 1 };
}

/** Parse a "YYYY-MM" param, falling back to the current SGT month. */
export function parseMonthParam(
  s: string | undefined,
  now: Date = new Date(),
): YearMonth {
  const m = /^(\d{4})-(\d{2})$/.exec(s ?? "");
  if (m) {
    const month = Number(m[2]);
    if (month >= 1 && month <= 12) return { year: Number(m[1]), month };
  }
  return currentMonthSGT(now);
}

/** Step a year-month by whole months (handles year wrap). */
export function addMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthParam({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`;
}

export function monthLabel({ year, month }: YearMonth): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * The weeks (Monday-first) covering a month, including leading/trailing days
 * from adjacent months so every week has 7 cells. Weeks that are entirely
 * outside the month are dropped.
 */
export function monthGrid({ year, month }: YearMonth): MonthCell[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // days from Monday to the 1st
  const start = new Date(Date.UTC(year, month - 1, 1 - offset));

  const weeks: MonthCell[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      const y = cur.getUTCFullYear();
      const mo = cur.getUTCMonth() + 1;
      const day = cur.getUTCDate();
      week.push({
        iso: `${y}-${pad(mo)}-${pad(day)}`,
        day,
        inMonth: mo === month && y === year,
        dow: cur.getUTCDay(),
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks.filter((week) => week.some((c) => c.inMonth));
}

/** The ISO date string for a `@db.Date` value (its UTC Y-M-D). */
export function isoOfDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
