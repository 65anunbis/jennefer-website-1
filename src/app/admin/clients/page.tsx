import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatWhatsappDisplay } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  await requireUser();
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { clientPackages: true, bookings: true } } },
  });

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
          <h1 className="mt-1 text-2xl font-semibold">Clients</h1>
        </div>
        <Link
          href="/admin/clients/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New client
        </Link>
      </header>

      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Packages</th>
              <th className="px-4 py-3 font-medium">Bookings</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{formatWhatsappDisplay(c.whatsappNumber)}</td>
                <td className="px-4 py-3">{c.email ?? "—"}</td>
                <td className="px-4 py-3">{c._count.clientPackages}</td>
                <td className="px-4 py-3">{c._count.bookings}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/clients/${c.id}`}
                    className="underline underline-offset-2"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
