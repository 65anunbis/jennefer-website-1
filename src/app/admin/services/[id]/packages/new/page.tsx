import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { PackageForm } from "../../../PackageForm";
import { createPackage } from "../../../actions";

export default async function NewPackagePage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const serviceId = Number(params.id);
  if (!Number.isInteger(serviceId)) notFound();

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) notFound();

  const action = createPackage.bind(null, serviceId);

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
          href={`/admin/services/${serviceId}`}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← {service.name}
        </Link>
      </div>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New package</h1>
      <PackageForm mode="create" action={action} serviceId={serviceId} />
      <div className="flex flex-wrap gap-2 mt-10 border-t border-neutral-200 pt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href={`/admin/services/${serviceId}`}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← {service.name}
        </Link>
      </div>
    </main>
  );
}
