import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { TestimonialForm } from "../TestimonialForm";
import { createTestimonial } from "../actions";

export default async function NewTestimonialPage() {
  await requireUser();
  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/testimonials"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← Testimonials
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New testimonial</h1>
      <TestimonialForm
        mode="create"
        action={createTestimonial}
        services={services}
      />
    </main>
  );
}
