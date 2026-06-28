import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateSGT, formatTimeSGT, todaySGT } from "@/lib/datetime";
import {
  WEEKDAY_LABELS,
  addMonth,
  currentMonthSGT,
  isoOfDate,
  monthGrid,
  monthLabel,
  monthParam,
  parseMonthParam,
} from "@/lib/calendar";
import { bookingInterval, minutesOfTime, rangesOverlap } from "@/lib/overlap";
import { ViewToggle } from "./ViewToggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings" };

const BLOCK_TYPE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  training: "Training",
  team_event: "Team event",
  personal: "Personal",
  public_holiday: "Public holiday",
  other: "Other",
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function blockSpanLabel(b: {
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  startTime: Date | null;
  endTime: Date | null;
}): string {
  const sameDay = isoOfDate(b.startDate) === isoOfDate(b.endDate);
  const datePart = sameDay
    ? formatDateSGT(b.startDate)
    : `${formatDateSGT(b.startDate)} – ${formatDateSGT(b.endDate)}`;
  if (b.allDay || !b.startTime || !b.endTime) return `${datePart} · all day`;
  return `${datePart}, ${formatTimeSGT(b.startTime)}–${formatTimeSGT(b.endTime)} SGT`;
}

export default async function BookingsCalendarPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  await requireUser();

  const ym = parseMonthParam(searchParams.month);
  const weeks = monthGrid(ym);
  const today = todaySGT();
  const current = currentMonthSGT();
  const isCurrentMonth = ym.year === current.year && ym.month === current.month;

  const gridStartIso = weeks[0][0].iso;
  const gridEndIso = weeks[weeks.length - 1][6].iso;
  const startDate = new Date(`${gridStartIso}T00:00:00.000Z`);
  const endDate = new Date(`${gridEndIso}T00:00:00.000Z`);

  const [counted, blocks, hours] = await Promise.all([
    // Non-cancelled bookings only — the day's badge counts what occupies it.
    prisma.booking.findMany({
      where: {
        scheduledDate: { gte: startDate, lte: endDate },
        status: { not: "cancelled" },
      },
      select: { scheduledDate: true, scheduledTime: true, durationMinutes: true },
    }),
    prisma.calendarBlock.findMany({
      where: { startDate: { lte: endDate }, endDate: { gte: startDate } },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        title: true,
        blockType: true,
        allDay: true,
        startTime: true,
        endTime: true,
      },
    }),
    prisma.businessHours.findMany({ select: { dayOfWeek: true } }),
  ]);

  const counts = new Map<string, number>();
  for (const b of counted) {
    const iso = isoOfDate(b.scheduledDate);
    counts.set(iso, (counts.get(iso) ?? 0) + 1);
  }

  const blockRanges = blocks.map((b) => ({
    start: isoOfDate(b.startDate),
    end: isoOfDate(b.endDate),
    title: b.title,
  }));

  // A weekday with no business_hours row is fully closed (e.g. Sunday).
  const openDows = new Set(hours.map((h) => h.dayOfWeek));

  // Days with a collision: a non-cancelled booking overlapping another booking
  // or a block on the same date (same rule as the list/day views).
  const bookingIvsByIso = new Map<string, { startMin: number; endMin: number }[]>();
  for (const b of counted) {
    const iso = isoOfDate(b.scheduledDate);
    const list = bookingIvsByIso.get(iso) ?? [];
    list.push(bookingInterval(minutesOfTime(b.scheduledTime), b.durationMinutes));
    bookingIvsByIso.set(iso, list);
  }
  const collisionDays = new Set<string>();
  for (const [iso, ivs] of Array.from(bookingIvsByIso.entries())) {
    const blockIvs = blocks
      .map((blk) => {
        const s = isoOfDate(blk.startDate);
        const e = isoOfDate(blk.endDate);
        if (iso < s || iso > e) return null;
        if (!blk.allDay && s === iso && blk.startTime && blk.endTime) {
          return {
            startMin: minutesOfTime(blk.startTime),
            endMin: minutesOfTime(blk.endTime),
          };
        }
        return { startMin: 0, endMin: 24 * 60 };
      })
      .filter((x): x is { startMin: number; endMin: number } => x !== null);
    let hit = false;
    for (let i = 0; i < ivs.length && !hit; i++) {
      for (let j = i + 1; j < ivs.length; j++) {
        if (rangesOverlap(ivs[i], ivs[j])) {
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const bv of blockIvs) {
          if (rangesOverlap(ivs[i], bv)) {
            hit = true;
            break;
          }
        }
      }
    }
    if (hit) collisionDays.add(iso);
  }

  const prev = addMonth(ym, -1);
  const next = addMonth(ym, 1);
  const prevYear = addMonth(ym, -12);
  const nextYear = addMonth(ym, 12);

  // Blocks overlapping the displayed month (for the "Blocks this month" list).
  const monthStartIso = `${ym.year}-${pad2(ym.month)}-01`;
  const monthEndIso = `${ym.year}-${pad2(ym.month)}-${pad2(
    new Date(Date.UTC(ym.year, ym.month, 0)).getUTCDate(),
  )}`;
  const monthBlocks = blocks
    .filter(
      (b) =>
        isoOfDate(b.startDate) <= monthEndIso &&
        isoOfDate(b.endDate) >= monthStartIso,
    )
    .sort((a, b) => isoOfDate(a.startDate).localeCompare(isoOfDate(b.startDate)));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Bookings</h1>
        </div>
        <Link
          href="/admin/bookings/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New booking
        </Link>
      </header>

      <ViewToggle active="calendar" />

      {/* Month navigation */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1">
          <Link
            href={`/admin/bookings?month=${monthParam(prevYear)}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            aria-label="Previous year"
          >
            «
          </Link>
          <Link
            href={`/admin/bookings?month=${monthParam(prev)}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            aria-label="Previous month"
          >
            ‹
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{monthLabel(ym)}</h2>
          {!isCurrentMonth && (
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
            >
              Today
            </Link>
          )}
        </div>
        <div className="flex gap-1">
          <Link
            href={`/admin/bookings?month=${monthParam(next)}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            aria-label="Next month"
          >
            ›
          </Link>
          <Link
            href={`/admin/bookings?month=${monthParam(nextYear)}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            aria-label="Next year"
          >
            »
          </Link>
        </div>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid grid-cols-7 gap-px text-center text-xs font-medium text-neutral-500">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
        {weeks.flat().map((cell) => {
          const count = counts.get(cell.iso) ?? 0;
          const cellBlocks = blockRanges.filter(
            (r) => r.start <= cell.iso && cell.iso <= r.end,
          );
          const closed = !openDows.has(cell.dow);
          const isToday = cell.iso === today;
          const bg = !cell.inMonth
            ? "bg-neutral-50 text-neutral-300"
            : closed
              ? "bg-neutral-100"
              : "bg-white";
          return (
            <Link
              key={cell.iso}
              href={`/admin/bookings/day/${cell.iso}`}
              className={`flex min-h-[3.75rem] flex-col p-1 hover:bg-neutral-50 sm:min-h-[5rem] ${bg}`}
            >
              <span
                className={`text-xs ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 font-semibold text-white" : "font-medium"}`}
              >
                {cell.day}
              </span>
              <span className="mt-auto flex items-center gap-1">
                {count > 0 && (
                  <span className="rounded bg-blue-100 px-1 text-xs font-medium text-blue-700">
                    {count}
                  </span>
                )}
                {cellBlocks.length > 0 && (
                  <span
                    className="h-2 w-2 rounded-full bg-purple-500"
                    title={cellBlocks.map((b) => b.title).join(", ")}
                  />
                )}
                {collisionDays.has(cell.iso) && (
                  <span className="text-xs text-amber-600" title="Has an overlap">
                    ⚠
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        <span className="rounded bg-blue-100 px-1 font-medium text-blue-700">n</span>{" "}
        bookings ·{" "}
        <span className="inline-block h-2 w-2 rounded-full bg-purple-500 align-middle" />{" "}
        calendar block · <span className="text-amber-600">⚠</span> overlap ·
        shaded = closed day. Tap a day to see it by the hour.
      </p>

      {monthBlocks.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Blocks this month
          </h2>
          <div className="mt-2 space-y-1">
            {monthBlocks.map((b) => (
              <Link
                key={b.id}
                href={`/admin/blocks/${b.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              >
                <span>
                  <span className="font-medium">{b.title}</span>
                  <span className="text-neutral-400">
                    {" "}
                    · {BLOCK_TYPE_LABELS[b.blockType] ?? b.blockType}
                  </span>
                </span>
                <span className="shrink-0 text-neutral-500">
                  {blockSpanLabel(b)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-2 border-t border-neutral-200 pt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
      </div>
    </main>
  );
}
