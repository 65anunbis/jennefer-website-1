import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { TestimonialForm } from "../TestimonialForm";
import { updateTestimonial } from "../actions";

export default async function EditTestimonialPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const [testimonial, services] = await Promise.all([
    prisma.testimonial.findUnique({ where: { id } }),
    prisma.service.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!testimonial) notFound();

  const action = updateTestimonial.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href="/admin/testimonials"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Testimonials
        </Link>
      </div>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit testimonial</h1>
      <TestimonialForm
        mode="edit"
        action={action}
        services={services}
        testimonial={{
          clientName: testimonial.clientName,
          serviceId: testimonial.serviceId,
          quote: testimonial.quote,
          visible: testimonial.visible,
          sortOrder: testimonial.sortOrder,
        }}
      />
      <div className="flex flex-wrap gap-2 mt-10 border-t border-neutral-200 pt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href="/admin/testimonials"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Testimonials
        </Link>
      </div>
    </main>
  );
}
