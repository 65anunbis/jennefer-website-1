"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

export type FormState = { error?: string };

type VenueInput = {
  name: string;
  address: string;
  color: string;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
  notes: string;
};

function readInput(
  formData: FormData,
): { ok: true; value: VenueInput } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const isDefault = formData.get("isDefault") === "on";
  const active = formData.get("active") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const sortRaw = String(formData.get("sortOrder") ?? "").trim();

  if (!name) return { ok: false, error: "Name is required." };

  const sortOrder = sortRaw === "" ? 0 : Number(sortRaw);
  if (!Number.isInteger(sortOrder) || sortOrder < 0)
    return { ok: false, error: "Sort order must be a whole number of 0 or more." };

  if (color && !/^#[0-9a-fA-F]{6}$/.test(color))
    return { ok: false, error: "Colour must be a hex code like #7c9a82 (or left blank)." };

  return {
    ok: true,
    value: { name, address, color, isDefault, active, sortOrder, notes },
  };
}

export async function createVenue(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const parsed = readInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  // Only one venue may be the default; setting this one unsets the others.
  const created = await prisma.$transaction(async (tx) => {
    if (v.isDefault) {
      await tx.venue.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.venue.create({
      data: {
        name: v.name,
        address: v.address || null,
        color: v.color || null,
        isDefault: v.isDefault,
        active: v.active,
        sortOrder: v.sortOrder,
        notes: v.notes || null,
      },
    });
  });

  await recordAudit("create", "venue", created.id, `Created venue: ${v.name}`);
  revalidatePath("/admin/venues");
  redirect("/admin/venues");
}

export async function updateVenue(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const target = await prisma.venue.findUnique({ where: { id } });
  if (!target) return { error: "Venue not found." };

  const parsed = readInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const changed: string[] = [];
  if (v.name !== target.name) changed.push("name");
  if ((v.address || null) !== target.address) changed.push("address");
  if ((v.color || null) !== target.color) changed.push("color");
  if (v.isDefault !== target.isDefault) changed.push("is_default");
  if (v.active !== target.active) changed.push("active");
  if (v.sortOrder !== target.sortOrder) changed.push("sort_order");
  if ((v.notes || null) !== target.notes) changed.push("notes");

  await prisma.$transaction(async (tx) => {
    if (v.isDefault) {
      await tx.venue.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    await tx.venue.update({
      where: { id },
      data: {
        name: v.name,
        address: v.address || null,
        color: v.color || null,
        isDefault: v.isDefault,
        active: v.active,
        sortOrder: v.sortOrder,
        notes: v.notes || null,
      },
    });
  });

  await recordAudit(
    "update",
    "venue",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath("/admin/venues");
  redirect("/admin/venues");
}
