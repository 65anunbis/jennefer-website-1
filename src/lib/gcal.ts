/**
 * Google Calendar write-only mirror — the SEAM only (plan §12).
 *
 * Phase 1 build: this is a NO-OP stub. The admin panel is the source of truth;
 * GCal is a one-way phone mirror that does not exist yet (OAuth creds + the ops
 * account + the 3 calendars are set up LAST, to dodge the OAuth testing-mode
 * 7-day refresh-token trap). Until `GOOGLE_CALENDAR_ID` + `GOOGLE_REFRESH_TOKEN`
 * are present, every push is a no-op.
 *
 * FAIL-SOFT (plan §12): a GCal push must NEVER block saving the booking/block to
 * Postgres. So callers save first, then call `syncBookingToGcal`; if a real push
 * ever throws (Phase: Google setup), we swallow it and record a row in
 * `gcal_sync_failures` (the retry queue) instead of surfacing an error. The
 * no-op path can't throw, so dev/preview simply records nothing.
 */
import { prisma } from "@/lib/db";
import type { GcalSyncOperation } from "@/generated/prisma/enums";

/** Whether real GCal pushes are wired up (creds present). Currently always false. */
export function isGcalEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_REFRESH_TOKEN,
  );
}

/** Event payload a real push will need; built by the caller, ignored by the stub. */
export type GcalEventPayload = {
  summary: string;
  description?: string;
  location?: string;
  /** Start as "YYYY-MM-DD" + "HH:MM" (SGT); end derived from duration by the pusher. */
  date: string;
  startTime: string;
  durationMinutes: number;
};

/**
 * Low-level push. NO-OP until creds exist: returns the existing event id
 * unchanged (or null for a create), so nothing downstream breaks. When the real
 * googleapis integration lands (Google-setup step) it replaces the throw.
 */
async function pushEvent(
  operation: GcalSyncOperation,
  existingEventId: string | null,
  payload: GcalEventPayload | null,
): Promise<string | null> {
  if (!isGcalEnabled()) {
    // Mirror is dormant: keep whatever id we had (null on create / delete).
    return operation === "delete" ? null : existingEventId;
  }
  // Real Google Calendar push is implemented in the Google-setup step; it will
  // turn `payload` into a calendar event. Referenced here so the seam compiles.
  void payload;
  throw new Error("Google Calendar integration is not yet configured");
}

/**
 * Sync a booking change to the mirrored GCal event, fail-soft. Returns the
 * `gcal_event_id` to persist on the booking (null in the no-op phase). On a real
 * failure it records a `gcal_sync_failures` row and returns the prior id so the
 * booking is never lost.
 */
export async function syncBookingToGcal(args: {
  bookingId: number;
  operation: GcalSyncOperation;
  existingEventId: string | null;
  payload: GcalEventPayload | null;
}): Promise<string | null> {
  const { bookingId, operation, existingEventId, payload } = args;
  try {
    return await pushEvent(operation, existingEventId, payload);
  } catch (err) {
    await recordSyncFailure("booking", bookingId, operation, err);
    return existingEventId;
  }
}

/** Same fail-soft seam for calendar blocks (used in 4.4's block actions later). */
export async function syncBlockToGcal(args: {
  blockId: number;
  operation: GcalSyncOperation;
  existingEventId: string | null;
  payload: GcalEventPayload | null;
}): Promise<string | null> {
  const { blockId, operation, existingEventId, payload } = args;
  try {
    return await pushEvent(operation, existingEventId, payload);
  } catch (err) {
    await recordSyncFailure("calendar_block", blockId, operation, err);
    return existingEventId;
  }
}

async function recordSyncFailure(
  resourceType: "booking" | "calendar_block",
  resourceId: number,
  operation: GcalSyncOperation,
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await prisma.gcalSyncFailure.create({
    data: {
      resourceType,
      resourceId,
      operation,
      attempts: 1,
      lastError: message.slice(0, 1000),
      lastAttemptAt: new Date(),
    },
  });
}
