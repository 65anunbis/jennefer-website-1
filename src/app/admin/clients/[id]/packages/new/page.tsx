import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { todaySGT } from "@/lib/datetime";
import { PurchaseForm } from "../PurchaseForm";
import { createPurchase } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();

  const clientId = Number(params.id);
  if (!Number.isInteger(clientId)) notFound();

  const [client, packages] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.servicePackage.findMany({
      where: { active: true },
      orderBy: [{ serviceId: "asc" }, { name: "asc" }],
      include: { service: true },
    }),
  ]);
  if (!client) notFound();

  const options = packages.map((p) => ({
    id: p.id,
    label: `${p.service.name} — ${p.name}`,
    priceSgd: p.priceSgd.toFixed(2),
    sessionsCount: p.sessionsCount,
  }));

  const action = createPurchase.bind(null, clientId);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href={`/admin/clients/${clientId}`}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← {client.name}
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Record package purchase</h1>
      <PurchaseForm
        mode="create"
        action={action}
        cancelHref={`/admin/clients/${clientId}`}
        packages={options}
        today={todaySGT()}
      />
    </main>
  );
}
