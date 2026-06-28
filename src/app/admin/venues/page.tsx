import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Venues" };

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
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
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

      {/* Mobile: stacked cards (below sm). Desktop keeps the table below. */}
      <div className="mt-8 space-y-2 sm:hidden">
        {venues.map((v) => (
          <Link
            key={v.id}
            href={`/admin/venues/${v.id}`}
            className={`block rounded-lg border border-neutral-200 bg-white p-3 ${v.active ? "" : "text-neutral-400"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{v.name}</span>
              <span className="shrink-0 text-xs text-neutral-400">Edit ›</span>
            </div>
            {v.address && <p className="text-sm">{v.address}</p>}
            <p className="text-xs">
              {v.isDefault && <span className="text-green-700">Default · </span>}
              {v.active ? (
                <span className="text-green-700">Active</span>
              ) : (
                <span>Inactive</span>
              )}
            </p>
          </Link>
        ))}
        {venues.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-neutral-500">
            No venues yet.
          </p>
        )}
      </div>

      {/* Desktop: table (sm and up) */}
      <div className="mt-8 hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Order</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Address</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Default</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {venues.map((v) => (
              <tr key={v.id} className={v.active ? "" : "text-neutral-400"}>
                <td className="hidden px-4 py-3 sm:table-cell">{v.sortOrder}</td>
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="hidden max-w-xs truncate px-4 py-3 sm:table-cell" title={v.address ?? ""}>
                  {v.address ?? "—"}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
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
