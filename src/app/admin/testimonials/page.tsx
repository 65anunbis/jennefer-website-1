import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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
            className="text-sm text-neutral-500 underline underline-offset-2"
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

      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Quote</th>
              <th className="px-4 py-3 font-medium">Visible</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {testimonials.map((t) => (
              <tr key={t.id} className={t.visible ? "" : "text-neutral-400"}>
                <td className="px-4 py-3">{t.sortOrder}</td>
                <td className="px-4 py-3">{t.clientName}</td>
                <td className="px-4 py-3">{t.service?.name ?? "—"}</td>
                <td className="max-w-xs truncate px-4 py-3" title={t.quote}>
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
    </main>
  );
}
