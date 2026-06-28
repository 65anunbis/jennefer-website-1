import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateSGT, formatTimeSGT } from "@/lib/datetime";
import { minutesOfTime } from "@/lib/overlap";
import { isoOfDate } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const CHIP_CLASS: Record<string, string> = {
  cancelled: "bg-neutral-200 text-neutral-600 line-through",
  completed: "bg-green-100 text-green-800",
  confirmed: "bg-blue-100 text-blue-800",
  no_show: "bg-red-100 text-red-700",
};

const pad = (n: number) => String(n).padStart(2, "0");

export default async function BookingDayPage({
  params,
}: {
  params: { date: string };
}) {
  await requireUser();

  const iso = params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) notFound();
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) notFound();
  const dow = date.getUTCDay();

  const [bookings, blocks, hours] = await Promise.all([
    prisma.booking.findMany({
      where: { scheduledDate: date },
      orderBy: { scheduledTime: "asc" },
      include: {
        client: { select: { name: true } },
        venue: { select: { name: true } },
      },
    }),
    prisma.calendarBlock.findMany({
      where: { startDate: { lte: date }, endDate: { gte: date } },
    }),
    prisma.businessHours.findMany({
      where: { dayOfWeek: dow },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // Open intervals (minutes) for cosmetic working-hours shading.
  const openIntervals = hours.map((h) => ({
    startMin: minutesOfTime(h.startTime),
    endMin: minutesOfTime(h.endTime),
  }));

  // Split blocks into all-day banners vs timed-on-this-date.
  const allDayBlocks: { title: string; blockType: string }[] = [];
  const timedBlocks: {
    id: number;
    title: string;
    startMin: number;
    endMin: number;
  }[] = [];
  for (const b of blocks) {
    const isStart = isoOfDate(b.startDate) === iso;
    if (!b.allDay && isStart && b.startTime && b.endTime) {
      timedBlocks.push({
        id: b.id,
        title: b.title,
        startMin: minutesOfTime(b.startTime),
        endMin: minutesOfTime(b.endTime),
      });
    } else {
      allDayBlocks.push({ title: b.title, blockType: b.blockType });
    }
  }

  // Visible window: cover working hours AND any out-of-hours booking/block.
  let minStart = openIntervals.length
    ? Math.min(...openIntervals.map((i) => i.startMin))
    : 8 * 60;
  let maxEnd = openIntervals.length
    ? Math.max(...openIntervals.map((i) => i.endMin))
    : 20 * 60;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const s = minutesOfTime(b.scheduledTime);
    minStart = Math.min(minStart, s);
    maxEnd = Math.max(maxEnd, s + b.durationMinutes);
  }
  for (const t of timedBlocks) {
    minStart = Math.min(minStart, t.startMin);
    maxEnd = Math.max(maxEnd, t.endMin);
  }
  const startHour = Math.max(0, Math.floor(minStart / 60));
  const endHour = Math.min(24, Math.ceil(maxEnd / 60));
  const hourList = Array.from(
    { length: Math.max(1, endHour - startHour) },
    (_, i) => startHour + i,
  );

  const working = (hour: number) =>
    openIntervals.some(
      (i) => i.startMin < (hour + 1) * 60 && hour * 60 < i.endMin,
    );

  // Bucket bookings and timed blocks by their start hour.
  const bookingsByHour = new Map<number, typeof bookings>();
  for (const b of bookings) {
    const h = Math.floor(minutesOfTime(b.scheduledTime) / 60);
    const list = bookingsByHour.get(h) ?? [];
    list.push(b);
    bookingsByHour.set(h, list);
  }
  const blocksByHour = new Map<number, typeof timedBlocks>();
  for (const t of timedBlocks) {
    const h = Math.floor(t.startMin / 60);
    const list = blocksByHour.get(h) ?? [];
    list.push(t);
    blocksByHour.set(h, list);
  }

  const prevIso = isoOfDate(new Date(date.getTime() - 86400000));
  const nextIso = isoOfDate(new Date(date.getTime() + 86400000));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href={`/admin/bookings?month=${iso.slice(0, 7)}`}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Calendar
        </Link>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <Link
          href={`/admin/bookings/day/${prevIso}`}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          aria-label="Previous day"
        >
          ‹
        </Link>
        <h1 className="text-xl font-semibold">{formatDateSGT(date)}</h1>
        <Link
          href={`/admin/bookings/day/${nextIso}`}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          aria-label="Next day"
        >
          ›
        </Link>
      </div>

      {allDayBlocks.length > 0 && (
        <div className="mt-4 space-y-1">
          {allDayBlocks.map((b, i) => (
            <div
              key={i}
              className="rounded-md bg-purple-100 px-3 py-2 text-sm text-purple-800"
            >
              {b.title}
              <span className="text-purple-500"> · all day</span>
            </div>
          ))}
        </div>
      )}

      {/* Hour-by-hour timeline. Working hours are white, outside is light pink
          (cosmetic only — out-of-hours bookings are still allowed). */}
      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
        {hourList.map((hour) => {
          const hh = `${pad(hour)}:00`;
          const dayBookings = bookingsByHour.get(hour) ?? [];
          const hourBlocks = blocksByHour.get(hour) ?? [];
          return (
            <div
              key={hour}
              className={`flex border-t border-neutral-100 first:border-t-0 ${working(hour) ? "bg-white" : "bg-pink-50"}`}
            >
              <div className="w-14 shrink-0 px-2 py-2 text-xs text-neutral-400">
                {hh}
              </div>
              <div className="flex-1 space-y-1 px-1 py-1.5">
                {hourBlocks.map((t) => (
                  <Link
                    key={`blk-${t.id}`}
                    href={`/admin/blocks/${t.id}`}
                    className="block rounded bg-purple-100 px-2 py-1 text-sm text-purple-800"
                  >
                    {formatTimeSGT(new Date(Date.UTC(1970, 0, 1, Math.floor(t.startMin / 60), t.startMin % 60)))}
                    –
                    {formatTimeSGT(new Date(Date.UTC(1970, 0, 1, Math.floor(t.endMin / 60), t.endMin % 60)))}{" "}
                    · {t.title}
                  </Link>
                ))}
                {dayBookings.map((b) => (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.id}`}
                    className={`block rounded px-2 py-1 text-sm ${CHIP_CLASS[b.status] ?? "bg-neutral-100"}`}
                  >
                    {formatTimeSGT(b.scheduledTime)} · {b.client.name}
                    <span className="opacity-70">
                      {" "}
                      ({b.durationMinutes}m ·{" "}
                      {b.deliveryType === "zoom" ? "Zoom" : b.venue?.name ?? "In person"}
                      {b.status !== "confirmed"
                        ? ` · ${STATUS_LABELS[b.status] ?? b.status}`
                        : ""}
                      )
                    </span>
                  </Link>
                ))}
                <Link
                  href={`/admin/bookings/new?date=${iso}&time=${hh}`}
                  className="block rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  + Add at {hh}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-10 border-t border-neutral-200 pt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href={`/admin/bookings?month=${iso.slice(0, 7)}`}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Calendar
        </Link>
      </div>
    </main>
  );
}
