"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { normalizeWhatsapp } from "@/lib/phone";

export type FormState = { error?: string };

type ClientInput = {
  name: string;
  whatsappNumber: string;
  email: string | null;
  notes: string | null;
  additionalId: string | null;
};

function readInput(
  formData: FormData,
): { ok: true; value: ClientInput } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const whatsappRaw = String(formData.get("whatsappNumber") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const additionalId = String(formData.get("additionalId") ?? "").trim();

  if (!name) return { ok: false, error: "Name is required." };

  if (!whatsappRaw) return { ok: false, error: "WhatsApp number is required." };
  const whatsappNumber = normalizeWhatsapp(whatsappRaw);
  if (!whatsappNumber)
    return {
      ok: false,
      error: "Enter a valid WhatsApp number (e.g. 9123 4567 or +65 9123 4567).",
    };

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Enter a valid email address (or leave it blank)." };

  return {
    ok: true,
    value: {
      name,
      whatsappNumber,
      email: email || null,
      notes: notes || null,
      additionalId: additionalId || null,
    },
  };
}

export async function createClient(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = readInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const created = await prisma.client.create({ data: v });

  await recordAudit("create", "client", created.id, "Created client record");
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${created.id}`);
}

export async function updateClient(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const target = await prisma.client.findUnique({ where: { id } });
  if (!target) return { error: "Client not found." };

  const parsed = readInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const changed: string[] = [];
  if (v.name !== target.name) changed.push("name");
  if (v.whatsappNumber !== target.whatsappNumber) changed.push("whatsapp_number");
  if (v.email !== target.email) changed.push("email");
  if (v.notes !== target.notes) changed.push("notes");
  if (v.additionalId !== target.additionalId) changed.push("additional_id");

  await prisma.client.update({ where: { id }, data: v });

  await recordAudit(
    "update",
    "client",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  redirect(`/admin/clients/${id}`);
}
