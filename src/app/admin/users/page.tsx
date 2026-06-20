import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function UsersPage() {
  const actor = await requireAdmin();
  const users = await prisma.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm text-neutral-500 underline underline-offset-2"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">User management</h1>
        </div>
        <Link
          href="/admin/users/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New user
        </Link>
      </header>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Username</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Last login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? "" : "text-neutral-400"}>
                <td className="px-4 py-3">
                  {u.name}
                  {u.id === Number(actor.id) && (
                    <span className="ml-2 text-xs text-neutral-400">(you)</span>
                  )}
                  {u.mustChangePassword && (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                      must change password
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">{u.username}</td>
                <td className="hidden px-4 py-3 sm:table-cell">{u.email ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="text-green-700">Active</span>
                  ) : (
                    <span>Inactive</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">{formatDate(u.lastLoginAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-neutral-900 underline underline-offset-2"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
