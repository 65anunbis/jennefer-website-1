import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { UserForm } from "../UserForm";
import { updateUser } from "../actions";

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const actor = await requireAdmin();

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) notFound();

  const action = updateUser.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← User management
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit user</h1>
      <UserForm
        mode="edit"
        action={action}
        user={{
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        }}
        isSelf={Number(actor.id) === id}
      />
    </main>
  );
}
