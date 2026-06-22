import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { VenueForm } from "../VenueForm";
import { createVenue } from "../actions";

export default async function NewVenuePage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/venues"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← Venues
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New venue</h1>
      <VenueForm mode="create" action={createVenue} />
    </main>
  );
}
