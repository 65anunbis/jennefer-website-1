import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { formatDateSGT, formatDateTimeSGT } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function SessionNotesPage({
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
      sessionNotes: {
        orderBy: [{ noteDate: "desc" }, { id: "desc" }],
        include: {
          booking: { select: { scheduledDate: true, scheduledTime: true } },
          createdByUser: { select: { name: true } },
        },
      },
    },
  });
  if (!client) notFound();

  // PDPA accountability (plan §10): reading a client's session notes is a
  // sensitive view — log it once per load against the client.
  await recordAudit(
    "view_sensitive",
    "client",
    clientId,
    "Viewed session notes for client",
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href={`/admin/clients/${clientId}`}
            className="text-sm text-neutral-500 underline underline-offset-2"
          >
            ← {client.name}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Session notes</h1>
        </div>
        <Link
          href={`/admin/clients/${clientId}/notes/new`}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Add note
        </Link>
      </header>

      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Confidential clinical notes — admin only. Access to this page is recorded
        in the audit log.
      </p>

      <div className="mt-6 space-y-4">
        {client.sessionNotes.map((n) => (
          <article
            key={n.id}
            className="rounded-lg border border-neutral-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {formatDateSGT(n.noteDate)}
                {n.booking && (
                  <span className="ml-2 font-normal text-neutral-500">
                    · session{" "}
                    {formatDateTimeSGT(n.booking.scheduledDate, n.booking.scheduledTime)}
                  </span>
                )}
              </div>
              <Link
                href={`/admin/clients/${clientId}/notes/${n.id}`}
                className="text-sm underline underline-offset-2"
              >
                Edit
              </Link>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{n.content}</p>
            <p className="mt-3 text-xs text-neutral-400">
              by {n.createdByUser.name}
            </p>
          </article>
        ))}
        {client.sessionNotes.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-sm text-neutral-500">
            No session notes yet.
          </p>
        )}
      </div>
    </main>
  );
}
