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
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← User management
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New user</h1>
      <UserForm mode="create" action={createUser} />
    </main>
  );
}
