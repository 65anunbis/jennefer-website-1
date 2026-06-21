import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/SignOutButton";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session!.user; // middleware guarantees an authenticated session
  const isAdmin = user.role === "admin";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Signed in as {user.name} ({user.role})
          </p>
        </div>
        <SignOutButton />
      </header>

      {searchParams.error === "forbidden" && (
        <p className="mt-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You don’t have access to that section.
        </p>
      )}

      <section className="mt-8 grid gap-3">
        <p className="text-sm text-neutral-600">
          Admin modules will appear here as they are built.
        </p>
        <ul className="grid gap-2 text-sm">
          <li>
            <Link
              href="/admin/bookings"
              className="text-neutral-900 underline underline-offset-2"
            >
              Bookings
            </Link>
          </li>
          <li>
            <Link
              href="/admin/clients"
              className="text-neutral-900 underline underline-offset-2"
            >
              Clients
            </Link>
          </li>
          <li>
            <Link
              href="/admin/blocks"
              className="text-neutral-900 underline underline-offset-2"
            >
              Calendar blocks
            </Link>
          </li>
          <li>
            <Link
              href="/admin/testimonials"
              className="text-neutral-900 underline underline-offset-2"
            >
              Testimonials
            </Link>
          </li>
          <li>
            <Link
              href="/admin/change-password"
              className="text-neutral-900 underline underline-offset-2"
            >
              Change password
            </Link>
          </li>
          {isAdmin && (
            <>
              <li>
                <Link
                  href="/admin/services"
                  className="text-neutral-900 underline underline-offset-2"
                >
                  Services &amp; pricing (admin only)
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/venues"
                  className="text-neutral-900 underline underline-offset-2"
                >
                  Venues (admin only)
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/business-hours"
                  className="text-neutral-900 underline underline-offset-2"
                >
                  Business hours (admin only)
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className="text-neutral-900 underline underline-offset-2"
                >
                  User management (admin only)
                </Link>
              </li>
            </>
          )}
        </ul>
      </section>
    </main>
  );
}
