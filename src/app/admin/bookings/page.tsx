import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateSGT, formatTimeSGT } from "@/lib/datetime";
import { formatWhatsappDisplay } from "@/lib/phone";
import { bookingInterval, minutesOfTime, rangesOverlap } from "@/lib/overlap";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

// Same status shading convention as the client booking-history table.
const ROW_CLASS: Record<string, string> = {
  cancelled: "bg-neutral-200 text-black",
  completed: "bg-green-100 text-black",
  confirmed: "bg-green-100 font-bold text-blue-700",
  no_show: "bg-green-100 text-red-700",
};

const COLSPAN = 7;

export default async function BookingsPage() {
  await requireUser();
  const bookings = await prisma.booking.findMany({
    orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
    include: {
      client: { select: { name: true, whatsappNumber: true } },
      venue: { select: { name: true } },
      clientPackage: {
        include: { package: { include: { service: true } } },
      },
    },
  });

  const blocks = await prisma.calendarBlock.findMany();

  // Flag bookings that overlap another non-cancelled booking OR a calendar
  // block on the same date (mirrors the booking form's soft overlap warning).
  // Cancelled bookings don't occupy time, so they neither flag nor count.
  const active = bookings.filter((b) => b.status !== "cancelled");
  const overlapIds = new Set<number>();
  for (const b of active) {
    const bi = bookingInterval(minutesOfTime(b.scheduledTime), b.durationMinutes);
    const dateMs = b.scheduledDate.getTime();
    const hit =
      active.some(
        (o) =>
          o.id !== b.id &&
          o.scheduledDate.getTime() === dateMs &&
          rangesOverlap(
            bi,
            bookingInterval(minutesOfTime(o.scheduledTime), o.durationMinutes),
          ),
      ) ||
      blocks.some((blk) => {
        if (blk.startDate.getTime() > dateMs || blk.endDate.getTime() < dateMs)
          return false;
        const sameStart = blk.startDate.getTime() === dateMs;
        const timed = !blk.allDay && blk.startTime && blk.endTime && sameStart;
        const interval = timed
          ? {
              startMin: minutesOfTime(blk.startTime!),
              endMin: minutesOfTime(blk.endTime!),
            }
          : { startMin: 0, endMin: 24 * 60 };
        return rangesOverlap(bi, interval);
      });
    if (hit) overlapIds.add(b.id);
  }

  // Group consecutive rows (already date-sorted) by their scheduled date.
  const groups: { date: Date; items: typeof bookings }[] = [];
  for (const b of bookings) {
    const last = groups[groups.length - 1];
    if (last && last.date.getTime() === b.scheduledDate.getTime()) {
      last.items.push(b);
    } else {
      groups.push({ date: b.scheduledDate, items: [b] });
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm text-neutral-500 underline underline-offset-2"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Bookings</h1>
          <p className="mt-1 text-sm text-neutral-500">
            All sessions. Calendar view comes next.
          </p>
        </div>
        <Link
          href="/admin/bookings/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New booking
        </Link>
      </header>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Time (SGT)</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">WhatsApp</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Delivery</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Package</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.date.getTime()} className="divide-y divide-neutral-100">
              <tr className="bg-neutral-50">
                <td
                  colSpan={COLSPAN}
                  className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500"
                >
                  {formatDateSGT(g.date)}
                </td>
              </tr>
              {g.items.map((b) => (
                <tr key={b.id} className={ROW_CLASS[b.status] ?? ""}>
                  <td className="px-4 py-3">
                    {formatTimeSGT(b.scheduledTime)}
                    {overlapIds.has(b.id) && (
                      <span
                        className="ml-1 text-amber-600"
                        title="Overlaps another booking or a calendar block"
                      >
                        ⚠
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{b.client.name}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {formatWhatsappDisplay(b.client.whatsappNumber)}
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_LABELS[b.status] ?? b.status}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {b.deliveryType === "zoom"
                      ? "Zoom"
                      : `In person${b.venue ? ` · ${b.venue.name}` : ""}`}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {b.clientPackage
                      ? `${b.clientPackage.package.service.name} — ${b.clientPackage.package.name}`
                      : "Ad-hoc"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="underline underline-offset-2"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
          {bookings.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={COLSPAN} className="px-4 py-6 text-center text-neutral-500">
                  No bookings yet.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </main>
  );
}
