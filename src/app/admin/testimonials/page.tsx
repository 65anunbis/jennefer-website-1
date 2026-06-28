import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  await requireUser();
  const testimonials = await prisma.testimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { service: true },
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
          <h1 className="mt-1 text-2xl font-semibold">Testimonials</h1>
        </div>
        <Link
          href="/admin/testimonials/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New testimonial
        </Link>
      </header>

      {/* Mobile: stacked cards (below sm). Desktop keeps the table below. */}
      <div className="mt-8 space-y-2 sm:hidden">
        {testimonials.map((t) => (
          <Link
            key={t.id}
            href={`/admin/testimonials/${t.id}`}
            className={`block rounded-lg border border-neutral-200 bg-white p-3 ${t.visible ? "" : "text-neutral-400"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{t.clientName}</span>
              <span className="shrink-0 text-xs text-neutral-400">Edit ›</span>
            </div>
            <p className="line-clamp-2 text-sm">“{t.quote}”</p>
            <p className="text-xs">
              {t.service?.name ?? "—"} ·{" "}
              {t.visible ? (
                <span className="text-green-700">Visible</span>
              ) : (
                <span>Hidden</span>
              )}{" "}
              · order {t.sortOrder}
            </p>
          </Link>
        ))}
        {testimonials.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-neutral-500">
            No testimonials yet.
          </p>
        )}
      </div>

      {/* Desktop: table (sm and up) */}
      <div className="mt-8 hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Order</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Service</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Quote</th>
              <th className="px-4 py-3 font-medium">Visible</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {testimonials.map((t) => (
              <tr key={t.id} className={t.visible ? "" : "text-neutral-400"}>
                <td className="hidden px-4 py-3 sm:table-cell">{t.sortOrder}</td>
                <td className="px-4 py-3">{t.clientName}</td>
                <td className="hidden px-4 py-3 sm:table-cell">{t.service?.name ?? "—"}</td>
                <td className="hidden max-w-xs truncate px-4 py-3 sm:table-cell" title={t.quote}>
                  {t.quote}
                </td>
                <td className="px-4 py-3">
                  {t.visible ? (
                    <span className="text-green-700">Visible</span>
                  ) : (
                    <span>Hidden</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/testimonials/${t.id}`}
                    className="underline underline-offset-2"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {testimonials.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  No testimonials yet.
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
