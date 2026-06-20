import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { ClientForm } from "../ClientForm";
import { createClient } from "../actions";

export default async function NewClientPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/clients"
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Clients
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New client</h1>
      <ClientForm mode="create" action={createClient} cancelHref="/admin/clients" />
    </main>
  );
}
