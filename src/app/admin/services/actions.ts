"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import type { DeliveryType } from "@/generated/prisma/enums";

export type FormState = { error?: string };

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "P2002"
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDelivery(v: FormDataEntryValue | null): DeliveryType | null {
  return v === "in_person" || v === "zoom" ? v : null;
}

/** Parse a positive integer from form input. */
function parseIntField(v: FormDataEntryValue | null): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) ? n : null;
}

// --- Services --------------------------------------------------------------

export async function createService(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) return { error: "Name is required." };
  const slug = slugify(slugInput || name);
  if (!slug) return { error: "Could not derive a slug; please enter one." };

  let created;
  try {
    created = await prisma.service.create({
      data: {
        name,
        slug,
        description: description || null,
        active,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "That slug is already in use." };
    throw e;
  }

  await recordAudit("create", "service", created.id, `Created service: ${name}`);
  revalidatePath("/admin/services");
  redirect("/admin/services");
}

export async function updateService(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const target = await prisma.service.findUnique({ where: { id } });
  if (!target) return { error: "Service not found." };

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) return { error: "Name is required." };
  const slug = slugify(slugInput || name);
  if (!slug) return { error: "Could not derive a slug; please enter one." };

  const changed: string[] = [];
  if (name !== target.name) changed.push("name");
  if (slug !== target.slug) changed.push("slug");
  if ((description || null) !== target.description) changed.push("description");
  if (active !== target.active) changed.push("active");

  try {
    await prisma.service.update({
      where: { id },
      data: { name, slug, description: description || null, active },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "That slug is already in use." };
    throw e;
  }

  await recordAudit(
    "update",
    "service",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath("/admin/services");
  redirect("/admin/services");
}

// --- Packages --------------------------------------------------------------

type PackageInput = {
  name: string;
  priceSgd: string;
  durationMinutes: number;
  sessionsCount: number;
  deliveryType: DeliveryType;
  description: string;
  active: boolean;
};

/** Validate the shared package fields; returns the parsed input or an error. */
function readPackageInput(
  formData: FormData,
): { ok: true; value: PackageInput } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = String(formData.get("priceSgd") ?? "").trim();
  const durationMinutes = parseIntField(formData.get("durationMinutes"));
  const sessionsCount = parseIntField(formData.get("sessionsCount"));
  const deliveryType = parseDelivery(formData.get("deliveryType"));
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) return { ok: false, error: "Name is required." };

  const price = Number(priceRaw);
  if (!priceRaw || !Number.isFinite(price) || price < 0)
    return { ok: false, error: "Price must be a number of 0 or more." };
  if (price > 99_999_999.99)
    return { ok: false, error: "Price is too large." };

  if (durationMinutes === null || durationMinutes <= 0)
    return { ok: false, error: "Duration must be a positive whole number of minutes." };
  if (sessionsCount === null || sessionsCount < 1)
    return { ok: false, error: "Sessions count must be at least 1." };
  if (!deliveryType)
    return { ok: false, error: "Please choose a delivery type." };

  return {
    ok: true,
    value: {
      name,
      priceSgd: price.toFixed(2),
      durationMinutes,
      sessionsCount,
      deliveryType,
      description,
      active,
    },
  };
}

export async function createPackage(
  serviceId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { error: "Service not found." };

  const parsed = readPackageInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const created = await prisma.servicePackage.create({
    data: {
      serviceId,
      name: v.name,
      priceSgd: v.priceSgd,
      durationMinutes: v.durationMinutes,
      sessionsCount: v.sessionsCount,
      deliveryType: v.deliveryType,
      description: v.description || null,
      active: v.active,
    },
  });

  await recordAudit(
    "create",
    "service_package",
    created.id,
    `Created package: ${v.name}`,
  );
  revalidatePath("/admin/services");
  redirect(`/admin/services/${serviceId}`);
}

export async function updatePackage(
  serviceId: number,
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const target = await prisma.servicePackage.findUnique({ where: { id } });
  if (!target || target.serviceId !== serviceId)
    return { error: "Package not found." };

  const parsed = readPackageInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const changed: string[] = [];
  if (v.name !== target.name) changed.push("name");
  if (Number(v.priceSgd) !== Number(target.priceSgd)) changed.push("price_sgd");
  if (v.durationMinutes !== target.durationMinutes)
    changed.push("duration_minutes");
  if (v.sessionsCount !== target.sessionsCount) changed.push("sessions_count");
  if (v.deliveryType !== target.deliveryType) changed.push("delivery_type");
  if ((v.description || null) !== target.description)
    changed.push("description");
  if (v.active !== target.active) changed.push("active");

  await prisma.servicePackage.update({
    where: { id },
    data: {
      name: v.name,
      priceSgd: v.priceSgd,
      durationMinutes: v.durationMinutes,
      sessionsCount: v.sessionsCount,
      deliveryType: v.deliveryType,
      description: v.description || null,
      active: v.active,
    },
  });

  await recordAudit(
    "update",
    "service_package",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath("/admin/services");
  redirect(`/admin/services/${serviceId}`);
}
