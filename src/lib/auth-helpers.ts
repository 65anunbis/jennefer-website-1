import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** The authenticated admin-panel user, or null. */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** Require any authenticated user; redirects to login otherwise. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Require an admin; redirects staff to the dashboard with a forbidden notice. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin?error=forbidden");
  return user;
}
