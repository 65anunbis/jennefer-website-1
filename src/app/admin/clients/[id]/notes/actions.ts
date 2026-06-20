"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

export type FormState = { error?: string };

/** Parse a "YYYY-MM-DD" date input into a UTC-midnight Date (for @db.Date). */
function parseDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

type NoteInput = {
  noteDate: Date;
  content: string;
  bookingId: number | null;
};

/**
 * Validate the note fields. A linked booking is optional but, when given, must
 * belong to this client (a note can also be standalone).
 */
async function readInput(
  clientId: number,
  formData: FormData,
): Promise<{ ok: true; value: NoteInput } | { ok: false; error: string }> {
  const noteDate = parseDate(formData.get("noteDate"));
  const content = String(formData.get("content") ?? "").trim();
  const bookingRaw = String(formData.get("bookingId") ?? "").trim();

  if (!noteDate) return { ok: false, error: "A valid note date is required." };
  if (!content) return { ok: false, error: "Note content is required." };

  let bookingId: number | null = null;
  if (bookingRaw !== "") {
    bookingId = Number(bookingRaw);
    if (!Number.isInteger(bookingId))
      return { ok: false, error: "Invalid booking." };
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.clientId !== clientId)
      return { ok: false, error: "Selected booking does not belong to this client." };
  }

  return { ok: true, value: { noteDate, content, bookingId } };
}

export async function createNote(
  clientId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdmin();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Client not found." };

  const parsed = await readInput(clientId, formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const created = await prisma.sessionNote.create({
    data: {
      clientId,
      bookingId: v.bookingId,
      noteDate: v.noteDate,
      content: v.content,
      createdBy: Number(user.id),
    },
  });

  await recordAudit("create", "session_note", created.id, "Created session note");
  revalidatePath(`/admin/clients/${clientId}/notes`);
  redirect(`/admin/clients/${clientId}/notes`);
}

export async function updateNote(
  clientId: number,
  noteId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const target = await prisma.sessionNote.findUnique({ where: { id: noteId } });
  if (!target || target.clientId !== clientId)
    return { error: "Session note not found." };

  const parsed = await readInput(clientId, formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const changed: string[] = [];
  if (v.noteDate.getTime() !== target.noteDate.getTime()) changed.push("note_date");
  if (v.content !== target.content) changed.push("content");
  if (v.bookingId !== target.bookingId) changed.push("booking_id");

  await prisma.sessionNote.update({
    where: { id: noteId },
    data: { noteDate: v.noteDate, content: v.content, bookingId: v.bookingId },
  });

  await recordAudit(
    "update",
    "session_note",
    noteId,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath(`/admin/clients/${clientId}/notes`);
  redirect(`/admin/clients/${clientId}/notes`);
}
