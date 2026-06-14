import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { ServiceForm } from "../ServiceForm";
import { createService } from "../actions";

export default async function NewServicePage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/services"
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Services &amp; pricing
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New service</h1>
      <ServiceForm mode="create" action={createService} />
    </main>
  );
}
