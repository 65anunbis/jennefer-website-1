"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  cancelHref: string;
  bookings: { id: number; label: string }[];
  today?: string;
  note?: {
    noteDate: string;
    content: string;
    bookingId: number | null;
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

export function SessionNoteForm({
  action,
  mode,
  cancelHref,
  bookings,
  today,
  note,
}: Props) {
  const [state, formAction] = useFormState(action, {} as FormState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Note date</span>
        <input
          name="noteDate"
          type="date"
          required
          defaultValue={note?.noteDate ?? today ?? ""}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Linked booking (optional)</span>
        <select
          name="bookingId"
          defaultValue={note?.bookingId?.toString() ?? ""}
          className={inputClass}
        >
          <option value="">— Standalone (no booking) —</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Content</span>
        <textarea
          name="content"
          rows={8}
          required
          defaultValue={note?.content ?? ""}
          placeholder="Clinical notes for this session…"
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={mode === "edit" ? "Save changes" : "Add note"} />
        <Link
          href={cancelHref}
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
