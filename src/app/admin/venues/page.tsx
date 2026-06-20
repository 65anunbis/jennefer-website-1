import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  await requireAdmin();
  const venues = await prisma.venue.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
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
          <h1 className="mt-1 text-2xl font-semibold">Venues</h1>
        </div>
        <Link
          href="/admin/venues/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New venue
        </Link>
      </header>

      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Default</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {venues.map((v) => (
              <tr key={v.id} className={v.active ? "" : "text-neutral-400"}>
                <td className="px-4 py-3">{v.sortOrder}</td>
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="max-w-xs truncate px-4 py-3" title={v.address ?? ""}>
                  {v.address ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {v.isDefault ? (
                    <span className="text-green-700">Default</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {v.active ? (
                    <span className="text-green-700">Active</span>
                  ) : (
                    <span>Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/venues/${v.id}`}
                    className="underline underline-offset-2"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {venues.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  No venues yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
