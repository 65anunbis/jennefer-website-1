import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ServiceForm } from "../ServiceForm";
import { updateService } from "../actions";

export default async function EditServicePage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) notFound();

  const action = updateService.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← Services &amp; pricing
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit service</h1>
      <ServiceForm
        mode="edit"
        action={action}
        service={{
          name: service.name,
          slug: service.slug,
          description: service.description,
          active: service.active,
        }}
      />
    </main>
  );
}
