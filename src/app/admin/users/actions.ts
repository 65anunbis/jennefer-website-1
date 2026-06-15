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
// 3–30 chars, must start alphanumeric, then lowercase letters/digits/. _ -
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Which unique field collided on a P2002, or null if it's not a uniqueness error. */
function uniqueViolationField(e: unknown): "username" | "email" | "unknown" | null {
  if (
    typeof e !== "object" ||
    e === null ||
    (e as { code?: string }).code !== "P2002"
  ) {
    return null;
  }
  const target = (e as { meta?: { target?: unknown } }).meta?.target;
  const fields = Array.isArray(target)
    ? target.map(String)
    : typeof target === "string"
      ? [target]
      : [];
  if (fields.some((f) => f.includes("username"))) return "username";
  if (fields.some((f) => f.includes("email"))) return "email";
  return "unknown";
}

function uniqueErrorMessage(field: "username" | "email" | "unknown"): string {
  if (field === "username") return "That username is already in use.";
  if (field === "email") return "That email is already in use.";
  return "That username or email is already in use.";
}

function parseRole(value: FormDataEntryValue | null): AdminRole | null {
  return value === "admin" || value === "staff" ? value : null;
}

function normalizeUsername(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

/** Trimmed, lowercased email, or null when the (optional) field is left blank. */
function normalizeEmail(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim().toLowerCase();
  return s.length ? s : null;
}

export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const username = normalizeUsername(formData.get("username"));
  const email = normalizeEmail(formData.get("email"));
  const role = parseRole(formData.get("role"));
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!username) return { error: "Username is required." };
  if (!USERNAME_RE.test(username))
    return {
      error:
        "Username must be 3–30 characters: lowercase letters, numbers, dot, underscore, or hyphen (starting with a letter or number).",
    };
  if (email && !EMAIL_RE.test(email))
    return { error: "Please enter a valid email address, or leave it blank." };
  if (!role) return { error: "Please choose a role." };
  if (password.length < PASSWORD_MIN)
    return { error: `Temporary password must be at least ${PASSWORD_MIN} characters.` };

  let created;
  try {
    created = await prisma.adminUser.create({
      data: {
        name,
        username,
        email,
        role,
        passwordHash: await bcrypt.hash(password, 10),
        isActive: true,
        mustChangePassword: true,
      },
    });
  } catch (e) {
    const field = uniqueViolationField(e);
    if (field) return { error: uniqueErrorMessage(field) };
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
  const username = normalizeUsername(formData.get("username"));
  const email = normalizeEmail(formData.get("email"));
  const role = parseRole(formData.get("role"));
  const isActive = formData.get("isActive") === "on";
  const newPassword = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!username) return { error: "Username is required." };
  if (!USERNAME_RE.test(username))
    return {
      error:
        "Username must be 3–30 characters: lowercase letters, numbers, dot, underscore, or hyphen (starting with a letter or number).",
    };
  if (email && !EMAIL_RE.test(email))
    return { error: "Please enter a valid email address, or leave it blank." };
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
  if (username !== target.username) changed.push("username");
  if (email !== target.email) changed.push("email");
  if (role !== target.role) changed.push("role");
  if (isActive !== target.isActive) changed.push("is_active");

  const data: {
    name: string;
    username: string;
    email: string | null;
    role: AdminRole;
    isActive: boolean;
    passwordHash?: string;
    mustChangePassword?: boolean;
  } = { name, username, email, role, isActive };

  if (newPassword) {
    data.passwordHash = await bcrypt.hash(newPassword, 10);
    data.mustChangePassword = true;
    changed.push("password");
  }

  try {
    await prisma.adminUser.update({ where: { id }, data });
  } catch (e) {
    const field = uniqueViolationField(e);
    if (field) return { error: uniqueErrorMessage(field) };
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
