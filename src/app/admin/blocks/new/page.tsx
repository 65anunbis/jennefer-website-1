import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { BlockForm } from "../BlockForm";
import { createBlock } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewBlockPage() {
  await requireUser();
  const venues = await prisma.venue.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/blocks"
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Calendar blocks
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New block</h1>
      <BlockForm mode="create" action={createBlock} venues={venues} />
    </main>
  );
}
