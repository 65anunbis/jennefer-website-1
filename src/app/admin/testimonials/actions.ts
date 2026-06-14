"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

export type FormState = { error?: string };

type TestimonialInput = {
  clientName: string;
  serviceId: number | null;
  quote: string;
  visible: boolean;
  sortOrder: number;
};

async function readInput(
  formData: FormData,
): Promise<{ ok: true; value: TestimonialInput } | { ok: false; error: string }> {
  const clientName = String(formData.get("clientName") ?? "").trim();
  const quote = String(formData.get("quote") ?? "").trim();
  const visible = formData.get("visible") === "on";
  const serviceRaw = String(formData.get("serviceId") ?? "").trim();
  const sortRaw = String(formData.get("sortOrder") ?? "").trim();

  if (!clientName) return { ok: false, error: "Client name is required." };
  if (!quote) return { ok: false, error: "Quote is required." };

  const sortOrder = sortRaw === "" ? 0 : Number(sortRaw);
  if (!Number.isInteger(sortOrder) || sortOrder < 0)
    return { ok: false, error: "Sort order must be a whole number of 0 or more." };

  let serviceId: number | null = null;
  if (serviceRaw !== "") {
    serviceId = Number(serviceRaw);
    if (!Number.isInteger(serviceId))
      return { ok: false, error: "Invalid service." };
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return { ok: false, error: "Selected service no longer exists." };
  }

  return { ok: true, value: { clientName, serviceId, quote, visible, sortOrder } };
}

export async function createTestimonial(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = await readInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const created = await prisma.testimonial.create({
    data: {
      clientName: v.clientName,
      serviceId: v.serviceId,
      quote: v.quote,
      visible: v.visible,
      sortOrder: v.sortOrder,
    },
  });

  await recordAudit(
    "create",
    "testimonial",
    created.id,
    `Created testimonial for ${v.clientName}`,
  );
  revalidatePath("/admin/testimonials");
  redirect("/admin/testimonials");
}

export async function updateTestimonial(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const target = await prisma.testimonial.findUnique({ where: { id } });
  if (!target) return { error: "Testimonial not found." };

  const parsed = await readInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const changed: string[] = [];
  if (v.clientName !== target.clientName) changed.push("client_name");
  if (v.serviceId !== target.serviceId) changed.push("service_id");
  if (v.quote !== target.quote) changed.push("quote");
  if (v.visible !== target.visible) changed.push("visible");
  if (v.sortOrder !== target.sortOrder) changed.push("sort_order");

  await prisma.testimonial.update({
    where: { id },
    data: {
      clientName: v.clientName,
      serviceId: v.serviceId,
      quote: v.quote,
      visible: v.visible,
      sortOrder: v.sortOrder,
    },
  });

  await recordAudit(
    "update",
    "testimonial",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath("/admin/testimonials");
  redirect("/admin/testimonials");
}
