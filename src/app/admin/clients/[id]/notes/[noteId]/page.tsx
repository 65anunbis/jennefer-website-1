import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateTimeSGT } from "@/lib/datetime";
import { SessionNoteForm } from "../SessionNoteForm";
import { updateNote } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditNotePage({
  params,
}: {
  params: { id: string; noteId: string };
}) {
  await requireAdmin();

  const clientId = Number(params.id);
  const noteId = Number(params.noteId);
  if (!Number.isInteger(clientId) || !Number.isInteger(noteId)) notFound();

  const [note, client] = await Promise.all([
    prisma.sessionNote.findUnique({ where: { id: noteId } }),
    prisma.client.findUnique({
      where: { id: clientId },
      include: {
        bookings: {
          orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
        },
      },
    }),
  ]);
  if (!note || note.clientId !== clientId || !client) notFound();

  const bookings = client.bookings.map((b) => ({
    id: b.id,
    label: formatDateTimeSGT(b.scheduledDate, b.scheduledTime),
  }));

  const action = updateNote.bind(null, clientId, noteId);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href={`/admin/clients/${clientId}/notes`}
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Session notes
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit session note</h1>
      <SessionNoteForm
        mode="edit"
        action={action}
        cancelHref={`/admin/clients/${clientId}/notes`}
        bookings={bookings}
        note={{
          noteDate: note.noteDate.toISOString().slice(0, 10),
          content: note.content,
          bookingId: note.bookingId,
        }}
      />
    </main>
  );
}
