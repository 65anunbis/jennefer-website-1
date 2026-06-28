"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

export type ClientOption = { id: number; name: string };
export type PackageOption = {
  id: number;
  clientId: number;
  label: string;
  remaining: number;
  deliveryType: "in_person" | "zoom";
  durationMinutes: number;
};
export type VenueOption = { id: number; name: string };

type BookingValues = {
  clientId: number;
  clientPackageId: number | null;
  deliveryType: "in_person" | "zoom";
  venueId: number | null;
  zoomJoinUrl: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  status: string;
  bookingNotes: string;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  clients: ClientOption[];
  packages: PackageOption[];
  venues: VenueOption[];
  booking?: BookingValues;
  defaultClientId?: number;
  defaultDate?: string;
  defaultTime?: string;
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function BookingForm({
  action,
  mode,
  clients,
  packages,
  venues,
  booking,
  defaultClientId,
  defaultDate,
  defaultTime,
}: Props) {
  const [state, formAction] = useFormState(action, {} as FormState);

  const [clientId, setClientId] = useState<string>(
    booking
      ? String(booking.clientId)
      : defaultClientId
        ? String(defaultClientId)
        : "",
  );
  const [clientPackageId, setClientPackageId] = useState<string>(
    booking?.clientPackageId ? String(booking.clientPackageId) : "",
  );
  const [deliveryType, setDeliveryType] = useState<"in_person" | "zoom">(
    booking?.deliveryType ?? "in_person",
  );
  const [duration, setDuration] = useState<string>(
    booking ? String(booking.durationMinutes) : "60",
  );

  // Packages belonging to the chosen client (plus, in edit mode, the booking's
  // own currently-linked package even if it is otherwise exhausted/inactive).
  const clientPackages = useMemo(
    () => packages.filter((p) => String(p.clientId) === clientId),
    [packages, clientId],
  );

  function onClientChange(value: string) {
    setClientId(value);
    setClientPackageId(""); // reset package when the client changes
  }

  function onPackageChange(value: string) {
    setClientPackageId(value);
    const pkg = packages.find((p) => String(p.id) === value);
    if (pkg) {
      setDeliveryType(pkg.deliveryType);
      setDuration(String(pkg.durationMinutes));
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved ✓
        </p>
      )}
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state.overlapWarning && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">⚠ {state.overlapWarning}</p>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" name="acknowledgeOverlap" className="h-4 w-4" />
            <span>Book anyway — I know it overlaps.</span>
          </label>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Client</span>
        <select
          name="clientId"
          value={clientId}
          onChange={(e) => onClientChange(e.target.value)}
          required
          className={inputClass}
        >
          <option value="">— Choose a client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Package</span>
        <select
          name="clientPackageId"
          value={clientPackageId}
          onChange={(e) => onPackageChange(e.target.value)}
          className={inputClass}
        >
          <option value="">— Ad-hoc (no package) —</option>
          {clientPackages.map((p) => {
            const isCurrent = String(p.id) === clientPackageId;
            const exhausted = p.remaining <= 0 && !isCurrent;
            return (
              <option key={p.id} value={p.id} disabled={exhausted}>
                {p.label} — {p.remaining} left{exhausted ? " (exhausted)" : ""}
              </option>
            );
          })}
        </select>
        {clientId === "" && (
          <span className="text-xs text-neutral-500">
            Choose a client to see their packages.
          </span>
        )}
      </label>

      <fieldset className="space-y-2">
        <span className="text-sm font-medium">Delivery</span>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="deliveryType"
              value="in_person"
              checked={deliveryType === "in_person"}
              onChange={() => setDeliveryType("in_person")}
            />
            In person
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="deliveryType"
              value="zoom"
              checked={deliveryType === "zoom"}
              onChange={() => setDeliveryType("zoom")}
            />
            Zoom
          </label>
        </div>
      </fieldset>

      {deliveryType === "in_person" ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Venue</span>
          <select
            name="venueId"
            defaultValue={booking?.venueId?.toString() ?? ""}
            className={inputClass}
          >
            <option value="">— Choose a venue —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Zoom link</span>
          <input
            name="zoomJoinUrl"
            type="text"
            defaultValue={booking?.zoomJoinUrl ?? "to arrange manually"}
            className={inputClass}
          />
          <span className="text-xs text-neutral-500">
            Leave as “to arrange manually” if you’ll sort the link out by chat.
          </span>
        </label>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Date</span>
          <input
            name="scheduledDate"
            type="date"
            required
            defaultValue={booking?.scheduledDate ?? defaultDate ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Start time (SGT)</span>
          <input
            name="scheduledTime"
            type="time"
            required
            defaultValue={booking?.scheduledTime ?? defaultTime ?? "10:00"}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Duration (minutes)</span>
        <input
          name="durationMinutes"
          type="number"
          min={1}
          max={600}
          required
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className={inputClass}
        />
      </label>

      {mode === "edit" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Status</span>
          <select
            name="status"
            defaultValue={booking?.status ?? "confirmed"}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          name="bookingNotes"
          rows={2}
          defaultValue={booking?.bookingNotes ?? ""}
          placeholder="e.g. first trial session; client requested morning slot"
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton
          label={
            state.overlapWarning
              ? "Save anyway"
              : mode === "edit"
                ? "Save changes"
                : "Create booking"
          }
        />
        <Link
          href="/admin/bookings"
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
