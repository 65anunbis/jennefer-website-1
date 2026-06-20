import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateSGT, formatTimeSGT } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const BLOCK_TYPE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  training: "Training",
  team_event: "Team event",
  personal: "Personal",
  public_holiday: "Public holiday",
  other: "Other",
};

function whenLabel(b: {
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  startTime: Date | null;
  endTime: Date | null;
}): string {
  const sameDay = b.startDate.getTime() === b.endDate.getTime();
  const dateRange = sameDay
    ? formatDateSGT(b.startDate)
    : `${formatDateSGT(b.startDate)} – ${formatDateSGT(b.endDate)}`;
  if (b.allDay || !b.startTime || !b.endTime) return `${dateRange} (all day)`;
  return `${dateRange}, ${formatTimeSGT(b.startTime)}–${formatTimeSGT(b.endTime)} SGT`;
}

export default async function BlocksPage() {
  await requireUser();
  const blocks = await prisma.calendarBlock.findMany({
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    include: { venue: { select: { name: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm text-neutral-500 underline underline-offset-2"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Calendar blocks</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Non-client time — vacation, training, public holidays, etc.
          </p>
        </div>
        <Link
          href="/admin/blocks/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New block
        </Link>
      </header>

      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">When (SGT)</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Venue</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {blocks.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">{whenLabel(b)}</td>
                <td className="px-4 py-3">
                  {BLOCK_TYPE_LABELS[b.blockType] ?? b.blockType}
                </td>
                <td className="px-4 py-3 font-medium">{b.title}</td>
                <td className="px-4 py-3">{b.venue?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/blocks/${b.id}`}
                    className="underline underline-offset-2"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {blocks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No calendar blocks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
