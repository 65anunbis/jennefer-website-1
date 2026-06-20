"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  venue?: {
    name: string;
    address: string | null;
    color: string | null;
    isDefault: boolean;
    active: boolean;
    sortOrder: number;
    notes: string | null;
  };
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

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

export function VenueForm({ action, mode, venue }: Props) {
  const [state, formAction] = useFormState(action, {} as FormState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Name</span>
        <input
          name="name"
          type="text"
          required
          defaultValue={venue?.name ?? ""}
          placeholder="e.g. Jennefer Wong Therapy"
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Address (optional)</span>
        <textarea
          name="address"
          rows={2}
          defaultValue={venue?.address ?? ""}
          placeholder="e.g. 100 Cecil Street #12-01, Singapore 069532"
          className={inputClass}
        />
        <span className="text-xs text-neutral-500">
          Shown to the client and pushed to the calendar event location.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Colour (optional)</span>
        <input
          name="color"
          type="text"
          defaultValue={venue?.color ?? ""}
          placeholder="#7c9a82"
          className={inputClass}
        />
        <span className="text-xs text-neutral-500">
          Hex code for future calendar colour-coding (e.g. #7c9a82).
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Sort order</span>
        <input
          name="sortOrder"
          type="number"
          min="0"
          step="1"
          defaultValue={venue?.sortOrder ?? 0}
          className={inputClass}
        />
        <span className="text-xs text-neutral-500">
          Lower numbers appear first in the booking venue picker.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={venue?.notes ?? ""}
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={venue?.isDefault ?? false}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">
          Default venue (pre-selected for new in-person bookings)
        </span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={venue?.active ?? true}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">
          Active (selectable when creating bookings)
        </span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={mode === "edit" ? "Save changes" : "Create venue"} />
        <Link
          href="/admin/venues"
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
