import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { UserForm } from "../UserForm";
import { createUser } from "../actions";

export default async function NewUserPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← User management
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New user</h1>
      <UserForm mode="create" action={createUser} />
    </main>
  );
}
