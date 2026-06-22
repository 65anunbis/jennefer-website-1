import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { PurchaseForm } from "../PurchaseForm";
import { updatePurchase } from "../actions";

export const dynamic = "force-dynamic";

/** A @db.Date value (UTC midnight) → "YYYY-MM-DD" for a date input. */
function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function EditPurchasePage({
  params,
}: {
  params: { id: string; pkgId: string };
}) {
  await requireUser();

  const clientId = Number(params.id);
  const pkgId = Number(params.pkgId);
  if (!Number.isInteger(clientId) || !Number.isInteger(pkgId)) notFound();

  const purchase = await prisma.clientPackage.findUnique({
    where: { id: pkgId },
    include: { package: { include: { service: true } } },
  });
  if (!purchase || purchase.clientId !== clientId) notFound();

  const action = updatePurchase.bind(null, clientId, pkgId);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href={`/admin/clients/${clientId}`}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← Client
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit package purchase</h1>
      <PurchaseForm
        mode="edit"
        action={action}
        cancelHref={`/admin/clients/${clientId}`}
        purchase={{
          packageLabel: `${purchase.package.service.name} — ${purchase.package.name}`,
          sessionsTotal: purchase.sessionsTotal,
          pricePaidSgd: purchase.pricePaidSgd.toFixed(2),
          purchasedDate: toDateInput(purchase.purchasedDate),
          status: purchase.status,
          paid: purchase.paid,
          paymentMode: purchase.paymentMode,
          paidDate: purchase.paidDate ? toDateInput(purchase.paidDate) : "",
          notes: purchase.notes ?? "",
        }}
      />
    </main>
  );
}
