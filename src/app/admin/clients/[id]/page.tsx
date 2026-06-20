import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatWhatsappDisplay } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/clients"
            className="text-sm text-neutral-500 underline underline-offset-2"
          >
            ← Clients
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{client.name}</h1>
        </div>
        <Link
          href={`/admin/clients/${client.id}/edit`}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          Edit
        </Link>
      </header>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
          <dt className="text-neutral-500">WhatsApp</dt>
          <dd>{formatWhatsappDisplay(client.whatsappNumber)}</dd>
          <dt className="text-neutral-500">Email</dt>
          <dd>{client.email ?? "—"}</dd>
          <dt className="text-neutral-500">Additional ID</dt>
          <dd>{client.additionalId ?? "—"}</dd>
          <dt className="text-neutral-500">Notes</dt>
          <dd className="whitespace-pre-wrap">{client.notes ?? "—"}</dd>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Packages &amp; sessions</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Package purchases and session consumption appear here (built next).
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Session notes</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Session notes appear here (built next; admin only).
        </p>
      </section>
    </main>
  );
}
