import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateSGT, formatTimeSGT } from "@/lib/datetime";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar blocks" };

const BLOCK_TYPE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  training: "Training",
  team_event: "Team event",
  personal: "Personal",
  public_holiday: "Public holiday",
  other: "Other",
};

const COLSPAN = 4;

/** Concise time/span for a block, WITHOUT the start date (that's the group header). */
function spanLabel(b: {
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  startTime: Date | null;
  endTime: Date | null;
}): string {
  const multiDay = b.startDate.getTime() !== b.endDate.getTime();
  const timePart =
    b.allDay || !b.startTime || !b.endTime
      ? "All day"
      : `${formatTimeSGT(b.startTime)}–${formatTimeSGT(b.endTime)} SGT`;
  return multiDay ? `${timePart} · until ${formatDateSGT(b.endDate)}` : timePart;
}

export default async function BlocksPage() {
  await requireUser();
  const blocks = await prisma.calendarBlock.findMany({
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    include: { venue: { select: { name: true } } },
  });

  // Group consecutive rows (already start-date-sorted) by their start date.
  const groups: { date: Date; items: typeof blocks }[] = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    if (last && last.date.getTime() === b.startDate.getTime()) {
      last.items.push(b);
    } else {
      groups.push({ date: b.startDate, items: [b] });
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
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

      {/* Mobile: stacked cards (below sm). Desktop keeps the table below. */}
      <div className="mt-8 space-y-6 sm:hidden">
        {groups.map((g) => (
          <section key={g.date.getTime()}>
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {formatDateSGT(g.date)}
            </h2>
            <div className="mt-2 space-y-2">
              {g.items.map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/blocks/${b.id}`}
                  className="block rounded-lg border border-neutral-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{b.title}</span>
                    <span className="shrink-0 text-xs text-neutral-400">Edit ›</span>
                  </div>
                  <p className="text-sm">{spanLabel(b)}</p>
                  <p className="text-xs text-neutral-500">
                    {BLOCK_TYPE_LABELS[b.blockType] ?? b.blockType}
                    {b.venue ? ` · ${b.venue.name}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {blocks.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-neutral-500">
            No calendar blocks yet.
          </p>
        )}
      </div>

      {/* Desktop: table (sm and up) */}
      <div className="mt-8 hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">When (SGT)</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.date.getTime()} className="divide-y divide-neutral-100">
              <tr className="bg-neutral-50">
                <td
                  colSpan={COLSPAN}
                  className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500"
                >
                  {formatDateSGT(g.date)}
                </td>
              </tr>
              {g.items.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">{spanLabel(b)}</td>
                  <td className="px-4 py-3 font-medium">
                    {b.title}
                    {b.venue && (
                      <span className="text-neutral-400"> · {b.venue.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {BLOCK_TYPE_LABELS[b.blockType] ?? b.blockType}
                  </td>
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
            </tbody>
          ))}
          {blocks.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={COLSPAN} className="px-4 py-6 text-center text-neutral-500">
                  No calendar blocks yet.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
      <div className="mt-10 flex flex-wrap gap-2 border-t border-neutral-200 pt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
      </div>
    </main>
  );
}
