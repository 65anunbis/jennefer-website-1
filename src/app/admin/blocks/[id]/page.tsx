import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatTimeSGT } from "@/lib/datetime";
import { BlockForm } from "../BlockForm";
import { DeleteBlockButton } from "../DeleteBlockButton";
import { updateBlock, deleteBlock } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditBlockPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const [block, venues] = await Promise.all([
    prisma.calendarBlock.findUnique({ where: { id } }),
    prisma.venue.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!block) notFound();

  const updateAction = updateBlock.bind(null, id);
  const deleteAction = deleteBlock.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/blocks"
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Calendar blocks
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit block</h1>
      <BlockForm
        mode="edit"
        action={updateAction}
        venues={venues}
        block={{
          blockType: block.blockType,
          title: block.title,
          startDate: block.startDate.toISOString().slice(0, 10),
          endDate: block.endDate.toISOString().slice(0, 10),
          allDay: block.allDay,
          startTime: block.startTime ? formatTimeSGT(block.startTime) : "",
          endTime: block.endTime ? formatTimeSGT(block.endTime) : "",
          venueId: block.venueId,
          notes: block.notes ?? "",
        }}
      />

      <div className="mt-8 border-t border-neutral-200 pt-6">
        <DeleteBlockButton action={deleteAction} />
      </div>
    </main>
  );
}
