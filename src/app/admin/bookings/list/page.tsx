import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatDateSGT, formatTimeSGT, todaySGT } from "@/lib/datetime";
import { formatWhatsappDisplay } from "@/lib/phone";
import { bookingInterval, minutesOfTime, rangesOverlap } from "@/lib/overlap";
import { isoOfDate } from "@/lib/calendar";
import { ViewToggle } from "../ViewToggle";
import { BookingsList, type BookingItem, type BlockItem } from "./BookingsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings" };

const BLOCK_TYPE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  training: "Training",
  team_event: "Team event",
  personal: "Personal",
  public_holiday: "Public holiday",
  other: "Other",
};

function blockSpanLabel(b: {
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  startTime: Date | null;
  endTime: Date | null;
}): string {
  const sameDay = isoOfDate(b.startDate) === isoOfDate(b.endDate);
  const datePart = sameDay
    ? formatDateSGT(b.startDate)
    : `${formatDateSGT(b.startDate)} – ${formatDateSGT(b.endDate)}`;
  if (b.allDay || !b.startTime || !b.endTime) return `${datePart} · all day`;
  return `${datePart}, ${formatTimeSGT(b.startTime)}–${formatTimeSGT(b.endTime)} SGT`;
}

export default async function BookingsListPage() {
  await requireUser();

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
      include: {
        client: { select: { name: true, whatsappNumber: true } },
        venue: { select: { name: true } },
        clientPackage: { include: { package: { include: { service: true } } } },
      },
    }),
    prisma.calendarBlock.findMany({ orderBy: [{ startDate: "desc" }] }),
  ]);

  // For each non-cancelled booking, collect WHAT it overlaps (other bookings /
  // blocks on the same date) so the warning names the culprits at a glance.
  const active = bookings.filter((b) => b.status !== "cancelled");
  const conflicts = new Map<number, string[]>();
  for (const b of active) {
    const bi = bookingInterval(minutesOfTime(b.scheduledTime), b.durationMinutes);
    const dateMs = b.scheduledDate.getTime();
    const labels: string[] = [];
    for (const o of active) {
      if (
        o.id !== b.id &&
        o.scheduledDate.getTime() === dateMs &&
        rangesOverlap(
          bi,
          bookingInterval(minutesOfTime(o.scheduledTime), o.durationMinutes),
        )
      ) {
        labels.push(`${formatTimeSGT(o.scheduledTime)} ${o.client.name}`);
      }
    }
    for (const blk of blocks) {
      if (blk.startDate.getTime() > dateMs || blk.endDate.getTime() < dateMs)
        continue;
      const sameStart = blk.startDate.getTime() === dateMs;
      const timed = !blk.allDay && blk.startTime && blk.endTime && sameStart;
      const interval = timed
        ? {
            startMin: minutesOfTime(blk.startTime!),
            endMin: minutesOfTime(blk.endTime!),
          }
        : { startMin: 0, endMin: 24 * 60 };
      if (rangesOverlap(bi, interval)) labels.push(`block “${blk.title}”`);
    }
    if (labels.length) conflicts.set(b.id, labels);
  }

  const bookingItems: BookingItem[] = bookings.map((b) => ({
    id: b.id,
    clientName: b.client.name,
    whatsapp: formatWhatsappDisplay(b.client.whatsappNumber),
    dateIso: isoOfDate(b.scheduledDate),
    time: formatTimeSGT(b.scheduledTime),
    startMin: minutesOfTime(b.scheduledTime),
    status: b.status,
    delivery:
      b.deliveryType === "zoom"
        ? "Zoom"
        : `In person${b.venue ? ` · ${b.venue.name}` : ""}`,
    package: b.clientPackage
      ? `${b.clientPackage.package.service.name} — ${b.clientPackage.package.name}`
      : "Ad-hoc",
    conflicts: conflicts.get(b.id) ?? [],
  }));

  const blockItems: BlockItem[] = blocks.map((b) => ({
    id: b.id,
    title: b.title,
    type: BLOCK_TYPE_LABELS[b.blockType] ?? b.blockType,
    startIso: isoOfDate(b.startDate),
    endIso: isoOfDate(b.endDate),
    startMin: !b.allDay && b.startTime ? minutesOfTime(b.startTime) : null,
    allDay: b.allDay,
    span: blockSpanLabel(b),
  }));

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
          <h1 className="mt-1 text-2xl font-semibold">Bookings</h1>
        </div>
        <Link
          href="/admin/bookings/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New booking
        </Link>
      </header>

      <ViewToggle active="list" />

      <BookingsList bookings={bookingItems} blocks={blockItems} today={todaySGT()} />

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
