import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { todaySGT } from "@/lib/datetime";
import { bookingMessage } from "@/lib/messages";
import {
  tomorrowSGT,
  bookingsAwaitingOutcome,
  remindersDue,
  findCollisions,
  sessionsMissingNotes,
  packagesToClose,
  clientsToRebook,
  unpaidPackages,
} from "@/lib/daily";
import {
  RefreshButton,
  OutcomeButtons,
  ReminderButton,
  MarkCompletedButton,
} from "./DailyButtons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily" };

const card =
  "flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3";
const jumpBtn =
  "shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-100";
const navBtn =
  "inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100";

function Section({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {title}{" "}
          <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
            {count}
          </span>
        </h2>
        <span className="text-xs text-neutral-400">{hint}</span>
      </div>
      <ul className="mt-2 space-y-2">{children}</ul>
    </section>
  );
}

export default async function DailyPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const now = new Date();
  const today = todaySGT(now);
  const tomorrow = tomorrowSGT(now);
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const tomorrowDate = new Date(`${tomorrow}T00:00:00.000Z`);

  const [confirmed, upcoming, blocks, upcomingConfirmed, packages, missingNotes] =
    await Promise.all([
      // Outcome (≤ today) + reminders (tomorrow) come from one confirmed pull.
      prisma.booking.findMany({
        where: { status: "confirmed", scheduledDate: { lte: tomorrowDate } },
        orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
        include: {
          client: { select: { name: true, whatsappNumber: true } },
          venue: { select: { name: true, address: true } },
          clientPackage: {
            include: { package: { include: { service: { select: { name: true } } } } },
          },
        },
      }),
      // Collisions: any upcoming booking (cancelled filtered in the helper).
      prisma.booking.findMany({
        where: { scheduledDate: { gte: todayDate } },
        select: {
          id: true,
          scheduledDate: true,
          scheduledTime: true,
          durationMinutes: true,
          status: true,
        },
      }),
      prisma.calendarBlock.findMany({
        where: { endDate: { gte: todayDate } },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          allDay: true,
          startTime: true,
          endTime: true,
        },
      }),
      // Clients who already have a future confirmed booking (excluded from rebook).
      prisma.booking.findMany({
        where: { status: "confirmed", scheduledDate: { gte: todayDate } },
        select: { clientId: true },
      }),
      // Packages (non-cancelled) for the close / rebook / unpaid sections.
      prisma.clientPackage.findMany({
        where: { status: { not: "cancelled" } },
        include: {
          client: { select: { name: true } },
          package: { select: { name: true } },
          bookings: { select: { status: true } },
        },
      }),
      // Completed bookings with no session note (admin-only section).
      isAdmin
        ? prisma.booking.findMany({
            where: { status: "completed", sessionNotes: { none: {} } },
            orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
            include: { client: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

  const outcomeItems = bookingsAwaitingOutcome(
    confirmed.map((b) => ({
      id: b.id,
      clientName: b.client.name,
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      status: b.status,
    })),
    now,
  );

  const reminderItems = remindersDue(
    confirmed.map((b) => ({
      id: b.id,
      clientName: b.client.name,
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      status: b.status,
      reminderSentAt: b.reminderSentAt,
      whatsapp: b.client.whatsappNumber,
      message: bookingMessage("reminder", {
        clientName: b.client.name,
        serviceName: b.clientPackage?.package.service.name ?? null,
        date: b.scheduledDate,
        time: b.scheduledTime,
        deliveryType: b.deliveryType,
        venueName: b.venue?.name ?? null,
        venueAddress: b.venue?.address ?? null,
        zoomJoinUrl: b.zoomJoinUrl,
      }),
    })),
    now,
  );

  const collisionItems = findCollisions(
    upcoming.map((b) => ({
      id: b.id,
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      durationMinutes: b.durationMinutes,
      status: b.status,
    })),
    blocks,
    now,
  );

  const noteItems = sessionsMissingNotes(
    missingNotes.map((b) => ({
      id: b.id,
      clientId: b.clientId,
      clientName: b.client.name,
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      status: b.status,
      hasNote: false,
    })),
  );

  const packageInputs = packages.map((p) => ({
    id: p.id,
    clientId: p.clientId,
    clientName: p.client.name,
    packageName: p.package.name,
    sessionsTotal: p.sessionsTotal,
    bookingStatuses: p.bookings.map((x) => x.status),
    status: p.status,
    paid: p.paid,
    pricePaidSgd: Number(p.pricePaidSgd),
  }));

  const clientIdsWithUpcoming = new Set(upcomingConfirmed.map((u) => u.clientId));
  const closeItems = packagesToClose(packageInputs);
  const rebookItems = clientsToRebook(packageInputs, clientIdsWithUpcoming);
  const unpaidItems = unpaidPackages(packageInputs);

  const total =
    outcomeItems.length +
    reminderItems.length +
    collisionItems.length +
    noteItems.length +
    closeItems.length +
    rebookItems.length +
    unpaidItems.length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin" className={navBtn}>
        ← Dashboard
      </Link>

      <div className="mt-1 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Daily processing</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {total === 0
              ? "Nothing needs attention."
              : `${total} item${total === 1 ? "" : "s"} need attention.`}
          </p>
        </div>
        <RefreshButton />
      </div>

      {total === 0 && (
        <div className="mt-10 rounded-lg border border-neutral-200 bg-white px-6 py-12 text-center">
          <p className="text-3xl">✓</p>
          <p className="mt-2 font-medium text-neutral-700">All clear</p>
          <p className="text-sm text-neutral-500">
            No outcomes to resolve, reminders to send, or follow-ups pending.
          </p>
        </div>
      )}

      {/* 1 — Bookings awaiting an outcome (today + overdue) */}
      <Section
        title="Bookings awaiting an outcome"
        hint="End of day"
        count={outcomeItems.length}
      >
        {outcomeItems.map((it) => (
          <li key={it.id} className={card}>
            <div className="min-w-0">
              <Link href={it.href} className="font-medium hover:underline">
                {it.clientName}
              </Link>
              <p className="text-xs text-neutral-500">
                {it.whenLabel}
                {it.overdue && (
                  <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                    Overdue
                  </span>
                )}
              </p>
            </div>
            <OutcomeButtons bookingId={it.id} />
          </li>
        ))}
      </Section>

      {/* 2 — Send tomorrow's reminders */}
      <Section
        title="Send tomorrow's reminders"
        hint="Start of day"
        count={reminderItems.length}
      >
        {reminderItems.map((it) => (
          <li key={it.id} className={card}>
            <div className="min-w-0">
              <Link href={it.href} className="font-medium hover:underline">
                {it.clientName}
              </Link>
              <p className="text-xs text-neutral-500">{it.whenLabel}</p>
            </div>
            <ReminderButton bookingId={it.id} waUrl={it.waUrl} />
          </li>
        ))}
      </Section>

      {/* 3 — Upcoming collisions */}
      <Section
        title="Booking collisions"
        hint="Start of day"
        count={collisionItems.length}
      >
        {collisionItems.map((it) => (
          <li key={it.dateIso} className={card}>
            <div className="min-w-0">
              <p className="font-medium">{it.dateLabel}</p>
              <p className="text-xs text-neutral-500">{it.label}</p>
            </div>
            <Link href={it.href} className={jumpBtn}>
              Go to day →
            </Link>
          </li>
        ))}
      </Section>

      {/* 4 — Completed sessions missing a note (admin-only) */}
      {isAdmin && (
        <Section
          title="Sessions missing a note"
          hint="Admin"
          count={noteItems.length}
        >
          {noteItems.map((it) => (
            <li key={it.id} className={card}>
              <div className="min-w-0">
                <p className="font-medium">{it.clientName}</p>
                <p className="text-xs text-neutral-500">{it.whenLabel}</p>
              </div>
              <Link href={it.href} className={jumpBtn}>
                Add note →
              </Link>
            </li>
          ))}
        </Section>
      )}

      {/* 5 — Exhausted packages to close */}
      <Section
        title="Packages to close"
        hint="Housekeeping"
        count={closeItems.length}
      >
        {closeItems.map((it) => (
          <li key={it.packageId} className={card}>
            <div className="min-w-0">
              <Link href={it.href} className="font-medium hover:underline">
                {it.clientName}
              </Link>
              <p className="text-xs text-neutral-500">
                {it.packageName} · 0 sessions left
              </p>
            </div>
            <MarkCompletedButton packageId={it.packageId} />
          </li>
        ))}
      </Section>

      {/* 6 — Unused sessions, no upcoming booking */}
      <Section
        title="Unused sessions, no upcoming booking"
        hint="Start of day"
        count={rebookItems.length}
      >
        {rebookItems.map((it) => (
          <li key={it.clientId} className={card}>
            <div className="min-w-0">
              <p className="font-medium">{it.clientName}</p>
              <p className="text-xs text-neutral-500">
                {it.remaining} session{it.remaining === 1 ? "" : "s"} unused
              </p>
            </div>
            <Link href={it.href} className={jumpBtn}>
              Rebook →
            </Link>
          </li>
        ))}
      </Section>

      {/* 7 — Unpaid packages */}
      <Section title="Unpaid packages" hint="Follow up" count={unpaidItems.length}>
        {unpaidItems.map((it) => (
          <li key={it.packageId} className={card}>
            <div className="min-w-0">
              <p className="font-medium">{it.clientName}</p>
              <p className="text-xs text-neutral-500">
                {it.packageName} · {it.amountLabel} unpaid
              </p>
            </div>
            <Link href={it.href} className={jumpBtn}>
              Go to package →
            </Link>
          </li>
        ))}
      </Section>

      <div className="mt-10 flex flex-wrap gap-2 border-t border-neutral-200 pt-6">
        <Link href="/admin" className={navBtn}>
          ← Dashboard
        </Link>
      </div>
    </main>
  );
}
