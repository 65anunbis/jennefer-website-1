"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  venues: { id: number; name: string }[];
  block?: {
    blockType: string;
    title: string;
    startDate: string;
    endDate: string;
    allDay: boolean;
    startTime: string;
    endTime: string;
    venueId: number | null;
    notes: string;
  };
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

const BLOCK_TYPE_OPTIONS = [
  { value: "vacation", label: "Vacation" },
  { value: "training", label: "Training" },
  { value: "team_event", label: "Team event" },
  { value: "personal", label: "Personal" },
  { value: "public_holiday", label: "Public holiday" },
  { value: "other", label: "Other" },
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

export function BlockForm({ action, mode, venues, block }: Props) {
  const [state, formAction] = useFormState(action, {} as FormState);
  const [allDay, setAllDay] = useState(block?.allDay ?? true);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Type</span>
        <select
          name="blockType"
          defaultValue={block?.blockType ?? "vacation"}
          className={inputClass}
        >
          {BLOCK_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Title</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={block?.title ?? ""}
          placeholder="e.g. Bali retreat"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Start date</span>
          <input
            name="startDate"
            type="date"
            required
            defaultValue={block?.startDate ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">End date</span>
          <input
            name="endDate"
            type="date"
            required
            defaultValue={block?.endDate ?? ""}
            className={inputClass}
          />
          <span className="text-xs text-neutral-500">
            Same as start for a single day.
          </span>
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">All day</span>
      </label>

      {!allDay && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Start time</span>
            <input
              name="startTime"
              type="time"
              defaultValue={block?.startTime ?? "09:00"}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">End time</span>
            <input
              name="endTime"
              type="time"
              defaultValue={block?.endTime ?? "13:00"}
              className={inputClass}
            />
          </label>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Venue (optional)</span>
        <select
          name="venueId"
          defaultValue={block?.venueId?.toString() ?? ""}
          className={inputClass}
        >
          <option value="">— Blocks Jennefer entirely —</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">
          Set only for a venue-specific closure (e.g. a room being unavailable).
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={block?.notes ?? ""}
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={mode === "edit" ? "Save changes" : "Create block"} />
        <Link
          href="/admin/blocks"
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
