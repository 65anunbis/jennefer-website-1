"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import type { PaymentMode, ClientPackageStatus } from "@/generated/prisma/enums";

export type FormState = { error?: string };

const PAYMENT_MODES: PaymentMode[] = [
  "paynow",
  "bank_transfer",
  "cash",
  "credit_card",
];
const STATUSES: ClientPackageStatus[] = ["active", "completed", "cancelled"];

/** Parse a "YYYY-MM-DD" date input into a UTC-midnight Date (for @db.Date). */
function parseDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

type PaymentFields = {
  pricePaidSgd: string;
  purchasedDate: Date;
  paid: boolean;
  paymentMode: PaymentMode;
  paidDate: Date | null;
  notes: string | null;
};

function readPayment(
  formData: FormData,
): { ok: true; value: PaymentFields } | { ok: false; error: string } {
  const priceRaw = String(formData.get("pricePaidSgd") ?? "").trim();
  const purchasedDate = parseDate(formData.get("purchasedDate"));
  const paid = formData.get("paid") === "on";
  const paymentModeRaw = String(formData.get("paymentMode") ?? "");
  const paidDate = parseDate(formData.get("paidDate"));
  const notes = String(formData.get("notes") ?? "").trim();

  const price = Number(priceRaw);
  if (!priceRaw || !Number.isFinite(price) || price < 0)
    return { ok: false, error: "Price paid must be a number of 0 or more." };
  if (price > 99_999_999.99) return { ok: false, error: "Price is too large." };

  if (!purchasedDate)
    return { ok: false, error: "A valid purchased date is required." };

  if (!PAYMENT_MODES.includes(paymentModeRaw as PaymentMode))
    return { ok: false, error: "Please choose a payment mode." };

  return {
    ok: true,
    value: {
      pricePaidSgd: price.toFixed(2),
      purchasedDate,
      paid,
      paymentMode: paymentModeRaw as PaymentMode,
      paidDate,
      notes: notes || null,
    },
  };
}

export async function createPurchase(
  clientId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Client not found." };

  const packageId = Number(String(formData.get("packageId") ?? "").trim());
  if (!Number.isInteger(packageId))
    return { error: "Please choose a package." };
  const pkg = await prisma.servicePackage.findUnique({
    where: { id: packageId },
    include: { service: true },
  });
  if (!pkg) return { error: "Selected package no longer exists." };

  const parsed = readPayment(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const created = await prisma.clientPackage.create({
    data: {
      clientId,
      packageId,
      sessionsTotal: pkg.sessionsCount, // snapshot from the catalog
      pricePaidSgd: v.pricePaidSgd,
      purchasedDate: v.purchasedDate,
      paid: v.paid,
      paymentMode: v.paymentMode,
      paidDate: v.paidDate,
      createdBy: Number(user.id),
      notes: v.notes,
    },
  });

  await recordAudit(
    "create",
    "client_package",
    created.id,
    `Recorded purchase: ${pkg.service.name} — ${pkg.name}`,
  );
  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}`);
}

export async function updatePurchase(
  clientId: number,
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const target = await prisma.clientPackage.findUnique({ where: { id } });
  if (!target || target.clientId !== clientId)
    return { error: "Package purchase not found." };

  const statusRaw = String(formData.get("status") ?? "");
  if (!STATUSES.includes(statusRaw as ClientPackageStatus))
    return { error: "Please choose a valid status." };
  const status = statusRaw as ClientPackageStatus;

  const parsed = readPayment(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const changed: string[] = [];
  if (status !== target.status) changed.push("status");
  if (Number(v.pricePaidSgd) !== Number(target.pricePaidSgd))
    changed.push("price_paid_sgd");
  if (v.purchasedDate.getTime() !== target.purchasedDate.getTime())
    changed.push("purchased_date");
  if (v.paid !== target.paid) changed.push("paid");
  if (v.paymentMode !== target.paymentMode) changed.push("payment_mode");
  if ((v.paidDate?.getTime() ?? null) !== (target.paidDate?.getTime() ?? null))
    changed.push("paid_date");
  if (v.notes !== target.notes) changed.push("notes");

  await prisma.clientPackage.update({
    where: { id },
    data: {
      status,
      pricePaidSgd: v.pricePaidSgd,
      purchasedDate: v.purchasedDate,
      paid: v.paid,
      paymentMode: v.paymentMode,
      paidDate: v.paidDate,
      notes: v.notes,
    },
  });

  await recordAudit(
    "update",
    "client_package",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}`);
}
