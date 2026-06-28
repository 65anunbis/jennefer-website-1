import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { PackageForm } from "../../../PackageForm";
import { updatePackage } from "../../../actions";

export default async function EditPackagePage({
  params,
}: {
  params: { id: string; packageId: string };
}) {
  await requireAdmin();

  const serviceId = Number(params.id);
  const packageId = Number(params.packageId);
  if (!Number.isInteger(serviceId) || !Number.isInteger(packageId)) notFound();

  const pkg = await prisma.servicePackage.findUnique({
    where: { id: packageId },
    include: { service: true },
  });
  if (!pkg || pkg.serviceId !== serviceId) notFound();

  const action = updatePackage.bind(null, serviceId, packageId);

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
          ← {pkg.service.name}
        </Link>
      </div>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit package</h1>
      <PackageForm
        mode="edit"
        action={action}
        serviceId={serviceId}
        pkg={{
          name: pkg.name,
          priceSgd: Number(pkg.priceSgd).toFixed(2),
          durationMinutes: pkg.durationMinutes,
          sessionsCount: pkg.sessionsCount,
          deliveryType: pkg.deliveryType,
          description: pkg.description,
          active: pkg.active,
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
          href={`/admin/services/${serviceId}`}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← {pkg.service.name}
        </Link>
      </div>
    </main>
  );
}
