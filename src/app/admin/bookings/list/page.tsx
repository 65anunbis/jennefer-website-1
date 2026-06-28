import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateSGT, formatTimeSGT } from "@/lib/datetime";
import { formatWhatsappDisplay } from "@/lib/phone";
import { bookingInterval, minutesOfTime, rangesOverlap } from "@/lib/overlap";
import { ViewToggle } from "../ViewToggle";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

// Modern status pills (replaces the old full-row background shading).
const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  completed: "bg-green-50 text-green-700 ring-1 ring-green-200",
  cancelled: "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200",
  no_show: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] ?? "bg-neutral-100 text-neutral-600"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const COLSPAN = 7;

export default async function BookingsListPage() {
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

  // For each non-cancelled booking, collect WHAT it overlaps (other bookings /
  // blocks on the same date) so the warning names the culprits at a glance.
  // Cancelled bookings don't occupy time, so they neither flag nor count.
  const active = bookings.filter((b) => b.status !== "cancelled");
  const conflicts = new Map<number, string[]>();
  for (const b of active) {
    const bi = bookingInterval(minutesOfTime(b.scheduledTime), b.durationMinutes);
    const dateMs = b.scheduledDate.getTime();
    const labels: string[] = [];
    for (const o of active) {
      if (
        o.id !== b.id &&
        o.scheduledDate.getTime() === dateMs &&
        rangesOverlap(
          bi,
          bookingInterval(minutesOfTime(o.scheduledTime), o.durationMinutes),
        )
      ) {
        labels.push(`${formatTimeSGT(o.scheduledTime)} ${o.client.name}`);
      }
    }
    for (const blk of blocks) {
      if (blk.startDate.getTime() > dateMs || blk.endDate.getTime() < dateMs)
        continue;
      const sameStart = blk.startDate.getTime() === dateMs;
      const timed = !blk.allDay && blk.startTime && blk.endTime && sameStart;
      const interval = timed
        ? {
            startMin: minutesOfTime(blk.startTime!),
            endMin: minutesOfTime(blk.endTime!),
          }
        : { startMin: 0, endMin: 24 * 60 };
      if (rangesOverlap(bi, interval)) labels.push(`block “${blk.title}”`);
    }
    if (labels.length) conflicts.set(b.id, labels);
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

      <ViewToggle active="list" />

      {/* Mobile: stacked cards (below sm). Desktop keeps the table below. */}
      <div className="mt-4 space-y-6 sm:hidden">
        {groups.map((g) => (
          <section key={g.date.getTime()}>
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {formatDateSGT(g.date)}
            </h2>
            <div className="mt-2 space-y-2">
              {g.items.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-xl border border-neutral-200 bg-white p-3 shadow-sm ${b.status === "cancelled" ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{b.client.name}</p>
                      <p className="text-sm text-neutral-500">
                        {formatTimeSGT(b.scheduledTime)} SGT
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  {conflicts.has(b.id) && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      ⚠ Overlaps {conflicts.get(b.id)!.join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-neutral-600">
                    {b.deliveryType === "zoom"
                      ? "Zoom"
                      : `In person${b.venue ? ` · ${b.venue.name}` : ""}`}
                    {" · "}
                    {b.clientPackage
                      ? `${b.clientPackage.package.service.name} — ${b.clientPackage.package.name}`
                      : "Ad-hoc"}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      {formatWhatsappDisplay(b.client.whatsappNumber)}
                    </span>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="text-sm font-medium text-neutral-900 underline underline-offset-2"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {bookings.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-neutral-500">
            No bookings yet.
          </p>
        )}
      </div>

      {/* Desktop: table (sm and up) */}
      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white sm:block">
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
                <tr
                  key={b.id}
                  className={`hover:bg-neutral-50 ${b.status === "cancelled" ? "text-neutral-400" : ""}`}
                >
                  <td className="px-4 py-3">{formatTimeSGT(b.scheduledTime)}</td>
                  <td className="px-4 py-3 font-medium">
                    {b.client.name}
                    {conflicts.has(b.id) && (
                      <span className="block text-xs font-normal text-amber-700">
                        ⚠ Overlaps {conflicts.get(b.id)!.join(", ")}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {formatWhatsappDisplay(b.client.whatsappNumber)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
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
