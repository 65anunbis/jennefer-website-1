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
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Venues
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New venue</h1>
      <VenueForm mode="create" action={createVenue} />
    </main>
  );
}
