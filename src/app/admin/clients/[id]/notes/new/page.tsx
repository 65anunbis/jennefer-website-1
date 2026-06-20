import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateTimeSGT, todaySGT } from "@/lib/datetime";
import { SessionNoteForm } from "../SessionNoteForm";
import { createNote } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewNotePage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const clientId = Number(params.id);
  if (!Number.isInteger(clientId)) notFound();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      bookings: {
        orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
      },
    },
  });
  if (!client) notFound();

  const bookings = client.bookings.map((b) => ({
    id: b.id,
    label: formatDateTimeSGT(b.scheduledDate, b.scheduledTime),
  }));

  const action = createNote.bind(null, clientId);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href={`/admin/clients/${clientId}/notes`}
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Session notes
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Add session note</h1>
      <SessionNoteForm
        mode="create"
        action={action}
        cancelHref={`/admin/clients/${clientId}/notes`}
        bookings={bookings}
        today={todaySGT()}
      />
    </main>
  );
}
