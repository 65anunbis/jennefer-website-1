"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import type { AdminRole } from "@/generated/prisma/enums";

export type UserFormState = { error?: string };

const PASSWORD_MIN = 8;

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "P2002"
  );
}

function parseRole(value: FormDataEntryValue | null): AdminRole | null {
  return value === "admin" || value === "staff" ? value : null;
}

export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = parseRole(formData.get("role"));
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };
  if (!role) return { error: "Please choose a role." };
  if (password.length < PASSWORD_MIN)
    return { error: `Temporary password must be at least ${PASSWORD_MIN} characters.` };

  let created;
  try {
    created = await prisma.adminUser.create({
      data: {
        name,
        email,
        role,
        passwordHash: await bcrypt.hash(password, 10),
        isActive: true,
        mustChangePassword: true,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "That email is already in use." };
    throw e;
  }

  await recordAudit("create", "admin_user", created.id, `Created user: ${role} role`);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(
  id: number,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireAdmin();

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) return { error: "User not found." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = parseRole(formData.get("role"));
  const isActive = formData.get("isActive") === "on";
  const newPassword = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };
  if (!role) return { error: "Please choose a role." };
  if (newPassword && newPassword.length < PASSWORD_MIN)
    return { error: `New password must be at least ${PASSWORD_MIN} characters.` };

  const isSelf = Number(actor.id) === id;
  if (isSelf && (role !== "admin" || !isActive)) {
    return {
      error:
        "You cannot remove your own admin access or deactivate your own account.",
    };
  }

  // Protect the last way in: never let the final active admin be demoted or
  // deactivated.
  const losingAdminAccess =
    target.role === "admin" &&
    target.isActive &&
    (role !== "admin" || !isActive);
  if (losingAdminAccess) {
    const activeAdmins = await prisma.adminUser.count({
      where: { role: "admin", isActive: true },
    });
    if (activeAdmins <= 1) {
      return { error: "Cannot demote or deactivate the last active admin." };
    }
  }

  const changed: string[] = [];
  if (name !== target.name) changed.push("name");
  if (email !== target.email) changed.push("email");
  if (role !== target.role) changed.push("role");
  if (isActive !== target.isActive) changed.push("is_active");

  const data: {
    name: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
    passwordHash?: string;
    mustChangePassword?: boolean;
  } = { name, email, role, isActive };

  if (newPassword) {
    data.passwordHash = await bcrypt.hash(newPassword, 10);
    data.mustChangePassword = true;
    changed.push("password");
  }

  try {
    await prisma.adminUser.update({ where: { id }, data });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "That email is already in use." };
    throw e;
  }

  await recordAudit(
    "update",
    "admin_user",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
