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
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href={`/admin/clients/${clientId}/notes`}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Session notes
        </Link>
      </div>
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
      <div className="flex flex-wrap gap-2 mt-10 border-t border-neutral-200 pt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href={`/admin/clients/${clientId}/notes`}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Session notes
        </Link>
      </div>
    </main>
  );
}
