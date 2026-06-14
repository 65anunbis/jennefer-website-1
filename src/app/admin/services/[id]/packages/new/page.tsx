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
      <Link
        href={`/admin/services/${serviceId}`}
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← {service.name}
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New package</h1>
      <PackageForm mode="create" action={action} serviceId={serviceId} />
    </main>
  );
}
