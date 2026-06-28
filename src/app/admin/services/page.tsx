import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services" };

function formatPrice(value: { toString(): string }) {
  return `$${Number(value).toFixed(2)}`;
}

const deliveryLabel: Record<string, string> = {
  in_person: "In person",
  zoom: "Zoom",
};

export default async function ServicesPage() {
  await requireAdmin();
  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      packages: { orderBy: [{ active: "desc" }, { sessionsCount: "asc" }] },
    },
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
          <h1 className="mt-1 text-2xl font-semibold">Services &amp; pricing</h1>
        </div>
        <Link
          href="/admin/services/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New service
        </Link>
      </header>

      <div className="mt-8 space-y-6">
        {services.map((service) => (
          <section
            key={service.id}
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
          >
            <div className="flex flex-col gap-2 border-b border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">
                  {service.name}
                  {!service.active && (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                      inactive
                    </span>
                  )}
                </h2>
                <p className="text-xs text-neutral-500">/{service.slug}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href={`/admin/services/${service.id}`}
                  className="underline underline-offset-2"
                >
                  Edit service
                </Link>
                <Link
                  href={`/admin/services/${service.id}/packages/new`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-100"
                >
                  Add package
                </Link>
              </div>
            </div>

            {service.packages.length === 0 ? (
              <p className="px-4 py-3 text-sm text-neutral-500">
                No packages yet.
              </p>
            ) : (
              <>
              {/* Mobile: stacked package cards (below sm). */}
              <div className="divide-y divide-neutral-100 sm:hidden">
                {service.packages.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/services/${service.id}/packages/${p.id}`}
                    className={`block px-4 py-3 ${p.active ? "" : "text-neutral-400"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        {p.name}
                        {!p.active && <span className="ml-2 text-xs">(inactive)</span>}
                      </span>
                      <span className="shrink-0 text-xs text-neutral-400">Edit ›</span>
                    </div>
                    <p className="text-xs text-neutral-600">
                      {formatPrice(p.priceSgd)} · {p.durationMinutes} min ·{" "}
                      {p.sessionsCount} session{p.sessionsCount === 1 ? "" : "s"} ·{" "}
                      {deliveryLabel[p.deliveryType] ?? p.deliveryType}
                    </p>
                  </Link>
                ))}
              </div>

              {/* Desktop: table (sm and up). */}
              <table className="hidden w-full text-left text-sm sm:table">
                <thead className="border-b border-neutral-100 text-neutral-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Package</th>
                    <th className="hidden px-4 py-2 font-medium sm:table-cell">Price</th>
                    <th className="hidden px-4 py-2 font-medium sm:table-cell">Duration</th>
                    <th className="px-4 py-2 font-medium">Sessions</th>
                    <th className="hidden px-4 py-2 font-medium sm:table-cell">Delivery</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {service.packages.map((p) => (
                    <tr key={p.id} className={p.active ? "" : "text-neutral-400"}>
                      <td className="px-4 py-2">
                        {p.name}
                        {!p.active && (
                          <span className="ml-2 text-xs">(inactive)</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2 sm:table-cell">{formatPrice(p.priceSgd)}</td>
                      <td className="hidden px-4 py-2 sm:table-cell">{p.durationMinutes} min</td>
                      <td className="px-4 py-2">{p.sessionsCount}</td>
                      <td className="hidden px-4 py-2 sm:table-cell">
                        {deliveryLabel[p.deliveryType] ?? p.deliveryType}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/admin/services/${service.id}/packages/${p.id}`}
                          className="underline underline-offset-2"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </section>
        ))}

        {services.length === 0 && (
          <p className="text-sm text-neutral-500">
            No services yet. Create one to get started.
          </p>
        )}
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
