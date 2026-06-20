import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { VenueForm } from "../VenueForm";
import { updateVenue } from "../actions";

export default async function EditVenuePage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) notFound();

  const action = updateVenue.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/venues"
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Venues
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit venue</h1>
      <VenueForm
        mode="edit"
        action={action}
        venue={{
          name: venue.name,
          address: venue.address,
          color: venue.color,
          isDefault: venue.isDefault,
          active: venue.active,
          sortOrder: venue.sortOrder,
          notes: venue.notes,
        }}
      />
    </main>
  );
}
