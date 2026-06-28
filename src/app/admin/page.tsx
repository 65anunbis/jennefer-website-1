import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/SignOutButton";

export const metadata = { title: "Dashboard" };

type Item = { href: string; label: string; desc: string };

const STAFF_ITEMS: Item[] = [
  { href: "/admin/bookings", label: "Bookings", desc: "Calendar, day view and booking list" },
  { href: "/admin/clients", label: "Clients", desc: "Directory, packages and session notes" },
  { href: "/admin/blocks", label: "Calendar blocks", desc: "Vacation, training, public holidays" },
  { href: "/admin/testimonials", label: "Testimonials", desc: "Show or hide client quotes" },
  { href: "/admin/change-password", label: "Change password", desc: "Update your login password" },
];

const ADMIN_ITEMS: Item[] = [
  { href: "/admin/services", label: "Services & pricing", desc: "Edit services and package prices" },
  { href: "/admin/venues", label: "Venues", desc: "Session locations" },
  { href: "/admin/business-hours", label: "Business hours", desc: "Weekly working hours" },
  { href: "/admin/users", label: "User management", desc: "Add or edit admin and staff logins" },
];

function MenuCard({ item }: { item: Item }) {
  return (
    <Link
      href={item.href}
      className="group rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
    >
      <p className="font-medium text-neutral-900">
        {item.label}
        <span className="text-neutral-300 transition group-hover:text-neutral-500">
          {" "}
          ›
        </span>
      </p>
      <p className="mt-0.5 text-sm text-neutral-500">{item.desc}</p>
    </Link>
  );
}

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <MenuCard key={item.href} item={item} />
        ))}
      </div>
    </section>
  );
}

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

      <Section title="Staff" items={STAFF_ITEMS} />
      {isAdmin && <Section title="Admin only" items={ADMIN_ITEMS} />}
    </main>
  );
}
