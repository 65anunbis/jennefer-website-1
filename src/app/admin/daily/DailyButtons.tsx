"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resolveOutcome,
  markReminderSent,
  markPackageCompleted,
} from "./actions";
import type { BookingStatus } from "@/generated/prisma/enums";

/** Re-run the server queries so items resolved elsewhere drop off the list. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100 disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "↻ Refresh"}
    </button>
  );
}

/** Resolve a confirmed booking to its outcome (server action revalidates). */
export function OutcomeButtons({ bookingId }: { bookingId: number }) {
  const [pending, start] = useTransition();
  const act = (status: BookingStatus) =>
    start(async () => {
      await resolveOutcome(bookingId, status);
    });

  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => act("completed")}
        className="rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        Completed
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => act("cancelled")}
        className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        Cancelled
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => act("no_show")}
        className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        No-show
      </button>
    </div>
  );
}

/**
 * One-tap reminder: open WhatsApp (synchronously, so the popup isn't blocked)
 * then stamp `reminderSentAt` so the row drops off. We accept fire-and-forget —
 * wa.me can't confirm the message was actually sent.
 */
export function ReminderButton({
  bookingId,
  waUrl,
}: {
  bookingId: number;
  waUrl: string;
}) {
  const [pending, start] = useTransition();
  const onClick = () => {
    window.open(waUrl, "_blank", "noopener");
    start(async () => {
      await markReminderSent(bookingId);
    });
  };
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="shrink-0 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
    >
      Send via WhatsApp
    </button>
  );
}

/** Flip an exhausted, still-active package to completed (manual). */
export function MarkCompletedButton({ packageId }: { packageId: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markPackageCompleted(packageId);
        })
      }
      className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
    >
      Mark completed
    </button>
  );
}
