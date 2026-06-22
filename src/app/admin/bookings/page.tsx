import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateSGT, formatTimeSGT } from "@/lib/datetime";

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

const COLSPAN = 6;

export default async function BookingsPage() {
  await requireUser();
  const bookings = await prisma.booking.findMany({
    orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
    include: {
      client: { select: { name: true } },
      venue: { select: { name: true } },
      clientPackage: {
        include: { package: { include: { service: true } } },
      },
    },
  });

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
                  <td className="px-4 py-3">{formatTimeSGT(b.scheduledTime)}</td>
                  <td className="px-4 py-3 font-medium">{b.client.name}</td>
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
