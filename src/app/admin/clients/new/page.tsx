import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { ClientForm } from "../ClientForm";
import { createClient } from "../actions";

export default async function NewClientPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Clients
        </Link>
      </div>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New client</h1>
      <ClientForm mode="create" action={createClient} cancelHref="/admin/clients" />

      <div className="mt-10 flex flex-wrap gap-2 border-t border-neutral-200 pt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Clients
        </Link>
      </div>
    </main>
  );
}
