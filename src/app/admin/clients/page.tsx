import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatWhatsappDisplay } from "@/lib/phone";
import { sessionsRemaining } from "@/lib/sessions";
import { ClientDirectory, type ClientRow } from "./ClientDirectory";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  await requireUser();
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      clientPackages: {
        select: {
          sessionsTotal: true,
          status: true,
          bookings: { select: { status: true } },
        },
      },
    },
  });

  const rows: ClientRow[] = clients.map((c) => {
    const live = c.clientPackages.filter((p) => p.status !== "cancelled");
    return {
      id: c.id,
      name: c.name,
      whatsapp: formatWhatsappDisplay(c.whatsappNumber),
      email: c.email,
      // "Usable" = non-cancelled packages that still have sessions left.
      usable: live.filter(
        (p) => sessionsRemaining(p.sessionsTotal, p.bookings.map((b) => b.status)) > 0,
      ).length,
      // Unused = total sessions still available to book across those packages.
      unused: live.reduce(
        (sum, p) =>
          sum + sessionsRemaining(p.sessionsTotal, p.bookings.map((b) => b.status)),
        0,
      ),
    };
  });

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
          <h1 className="mt-1 text-2xl font-semibold">Clients</h1>
        </div>
        <Link
          href="/admin/clients/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New client
        </Link>
      </header>

      <ClientDirectory rows={rows} />
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
