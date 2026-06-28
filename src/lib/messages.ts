/**
 * Client notification message templates (plan §7/§11). Pure string builders so
 * the same wording is reused for the WhatsApp `wa.me` link and the plain-text
 * copy button (one source of truth), and so they're unit-testable (Vitest 4.6).
 *
 * Delivery-aware: in-person messages name the venue; Zoom messages embed the
 * join link ONLY when a real one has been entered — the Phase-1 placeholder
 * "to arrange manually" is never sent as if it were a link.
 */
import { formatDateSGT, formatTimeSGT } from "@/lib/datetime";

const SIGNATURE = "— Jennefer Wong";
const ZOOM_PLACEHOLDER = "to arrange manually";

export type BookingMessageInput = {
  clientName: string;
  serviceName: string | null; // null → generic "session"
  date: Date; // scheduledDate (@db.Date)
  time: Date; // scheduledTime (@db.Time)
  deliveryType: "in_person" | "zoom";
  venueName: string | null;
  venueAddress: string | null;
  zoomJoinUrl: string | null;
};

export type MessageKind =
  | "confirmation"
  | "reschedule"
  | "cancellation"
  | "reminder";

/** True when a usable Zoom link has been entered (not blank / the placeholder). */
export function hasRealZoomLink(url: string | null): boolean {
  if (!url) return false;
  const t = url.trim();
  return t !== "" && t.toLowerCase() !== ZOOM_PLACEHOLDER;
}

function service(b: BookingMessageInput): string {
  return b.serviceName ?? "session";
}

function when(b: BookingMessageInput): string {
  return `${formatDateSGT(b.date)} at ${formatTimeSGT(b.time)} (SGT)`;
}

/** " at <venue>" / " via Zoom: <link>" / " via Zoom" depending on delivery. */
function where(b: BookingMessageInput): string {
  if (b.deliveryType === "in_person") {
    const loc = b.venueAddress || b.venueName;
    return loc ? ` at ${loc}` : "";
  }
  return hasRealZoomLink(b.zoomJoinUrl)
    ? ` via Zoom: ${b.zoomJoinUrl!.trim()}`
    : " via Zoom";
}

/** Note appended for Zoom bookings with no real link yet. */
function zoomNote(b: BookingMessageInput): string {
  return b.deliveryType === "zoom" && !hasRealZoomLink(b.zoomJoinUrl)
    ? " I'll send you the Zoom link closer to the date."
    : "";
}

export function bookingMessage(kind: MessageKind, b: BookingMessageInput): string {
  switch (kind) {
    case "confirmation":
      return `Hi ${b.clientName}, your ${service(b)} is confirmed for ${when(b)}${where(b)}.${zoomNote(b)} See you then! ${SIGNATURE}`;
    case "reschedule":
      return `Hi ${b.clientName}, your ${service(b)} has been rescheduled to ${when(b)}${where(b)}.${zoomNote(b)} See you then! ${SIGNATURE}`;
    case "reminder":
      return `Hi ${b.clientName}, a friendly reminder of your ${service(b)} on ${when(b)}${where(b)}.${zoomNote(b)} See you then! ${SIGNATURE}`;
    case "cancellation":
      return `Hi ${b.clientName}, your ${service(b)} on ${when(b)} has been cancelled. Please reach out if you'd like to rebook. ${SIGNATURE}`;
  }
}
