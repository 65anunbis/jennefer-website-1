import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ClientForm } from "../../ClientForm";
import { updateClient } from "../../actions";

export default async function EditClientPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  const action = updateClient.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href={`/admin/clients/${id}`}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← {client.name}
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit client</h1>
      <ClientForm
        mode="edit"
        action={action}
        cancelHref={`/admin/clients/${id}`}
        client={{
          name: client.name,
          whatsappNumber: client.whatsappNumber,
          email: client.email,
          notes: client.notes,
          additionalId: client.additionalId,
        }}
      />
    </main>
  );
}
