import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatWhatsappDisplay } from "@/lib/phone";
import { formatDateSGT, formatDateTimeSGT } from "@/lib/datetime";
import { consumedSessions, sessionsRemaining } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const PAYMENT_MODE_LABELS: Record<string, string> = {
  paynow: "PayNow",
  bank_transfer: "bank transfer",
  cash: "cash",
  credit_card: "credit card",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  confirmed: "Confirmed",
  no_show: "No-show",
};

// Booking-history row shading by status (plan UI request 2026-06-20).
const BOOKING_ROW_CLASS: Record<string, string> = {
  cancelled: "bg-neutral-200 text-black",
  completed: "bg-green-100 text-black",
  confirmed: "bg-green-100 font-bold text-blue-700",
  no_show: "bg-green-100 text-red-700",
};

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      clientPackages: {
        orderBy: { purchasedDate: "asc" },
        include: {
          package: { include: { service: true } },
          bookings: { select: { status: true } },
        },
      },
      bookings: {
        orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
        include: {
          venue: { select: { name: true } },
          clientPackage: {
            include: { package: { include: { service: true } } },
          },
        },
      },
    },
  });
  if (!client) notFound();

  // Session notes are admin-only; staff never see them (not even the count).
  const sessionNoteCount = isAdmin
    ? await prisma.sessionNote.count({ where: { clientId: id } })
    : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
          >
            ← Clients
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{client.name}</h1>
        </div>
        <Link
          href={`/admin/clients/${client.id}/edit`}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          Edit
        </Link>
      </header>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
          <dt className="text-neutral-500">WhatsApp</dt>
          <dd>{formatWhatsappDisplay(client.whatsappNumber)}</dd>
          <dt className="text-neutral-500">Email</dt>
          <dd>{client.email ?? "—"}</dd>
          <dt className="text-neutral-500">Additional ID</dt>
          <dd>{client.additionalId ?? "—"}</dd>
          <dt className="text-neutral-500">Notes</dt>
          <dd className="whitespace-pre-wrap">{client.notes ?? "—"}</dd>
        </dl>
      </section>

      {/* Packages & sessions ------------------------------------------------ */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Packages &amp; sessions</h2>
          <Link
            href={`/admin/clients/${client.id}/packages/new`}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Record purchase
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">Package</th>
                <th className="px-4 py-3 font-medium">Purchased</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Sessions</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {client.clientPackages.map((cp) => {
                const statuses = cp.bookings.map((b) => b.status);
                const used = consumedSessions(statuses);
                const remaining = sessionsRemaining(cp.sessionsTotal, statuses);
                return (
                  <tr key={cp.id}>
                    <td className="px-4 py-3">
                      {cp.package.service.name} — {cp.package.name}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateSGT(cp.purchasedDate)}
                    </td>
                    <td className="px-4 py-3">
                      {STATUS_LABELS[cp.status] ?? cp.status}
                    </td>
                    <td className="px-4 py-3">
                      {cp.paid ? (
                        <span className="text-green-700">
                          Paid ({PAYMENT_MODE_LABELS[cp.paymentMode] ?? cp.paymentMode})
                        </span>
                      ) : (
                        <span className="text-amber-700">Unpaid</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {used} used · {remaining} left{" "}
                      <span className="text-neutral-400">/ {cp.sessionsTotal}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clients/${client.id}/packages/${cp.id}`}
                        className="underline underline-offset-2"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {client.clientPackages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                    No packages purchased yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Booking history (managed from the Bookings module) ---------------- */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Booking history</h2>
          <Link
            href={`/admin/bookings/new?clientId=${client.id}`}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add booking
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">When (SGT)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Delivery</th>
                <th className="px-4 py-3 font-medium">Package</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {client.bookings.map((b) => (
                <tr key={b.id} className={BOOKING_ROW_CLASS[b.status] ?? ""}>
                  <td className="px-4 py-3">
                    {formatDateTimeSGT(b.scheduledDate, b.scheduledTime)}
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_LABELS[b.status] ?? b.status}
                  </td>
                  <td className="px-4 py-3">
                    {b.deliveryType === "zoom"
                      ? "Zoom"
                      : `In person${b.venue ? ` · ${b.venue.name}` : ""}`}
                  </td>
                  <td className="px-4 py-3">
                    {b.clientPackage
                      ? `${b.clientPackage.package.service.name} — ${b.clientPackage.package.name}`
                      : "Ad-hoc"}
                  </td>
                </tr>
              ))}
              {client.bookings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Session notes (admin only; staff don't see this section at all) ---- */}
      {isAdmin && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Session notes</h2>
          <p className="mt-2 text-sm text-neutral-600">
            {sessionNoteCount} note{sessionNoteCount === 1 ? "" : "s"} on record.{" "}
            <Link
              href={`/admin/clients/${client.id}/notes`}
              className="underline underline-offset-2"
            >
              View session notes
            </Link>{" "}
            <span className="text-neutral-400">(confidential — access is audited)</span>
          </p>
        </section>
      )}
    </main>
  );
}
