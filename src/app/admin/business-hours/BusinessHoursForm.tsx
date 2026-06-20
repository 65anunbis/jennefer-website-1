"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

type Row = { key: number; dayOfWeek: number; start: string; end: string };

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: { dayOfWeek: number; start: string; end: string }[];
};

// Display Monday-first; Sunday (0) last.
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const timeInputClass =
  "rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-900";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save business hours"}
    </button>
  );
}

export function BusinessHoursForm({ action, initial }: Props) {
  const [state, formAction] = useFormState(action, {} as FormState);
  const nextKey = useRef(0);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((iv) => ({ key: nextKey.current++, ...iv })),
  );

  function addRow(dayOfWeek: number) {
    setRows((rs) => [
      ...rs,
      { key: nextKey.current++, dayOfWeek, start: "09:00", end: "17:00" },
    ]);
  }

  function removeRow(key: number) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function setField(key: number, field: "start" | "end", value: string) {
    setRows((rs) =>
      rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  }

  const serialized = JSON.stringify(
    rows.map(({ dayOfWeek, start, end }) => ({ dayOfWeek, start, end })),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="intervals" value={serialized} />

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Business hours saved.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {DAYS.map((day) => {
          const dayRows = rows.filter((r) => r.dayOfWeek === day.value);
          return (
            <div
              key={day.value}
              className="flex flex-col gap-2 border-b border-neutral-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="w-28 pt-1 text-sm font-medium">{day.label}</div>
              <div className="flex-1 space-y-2">
                {dayRows.length === 0 && (
                  <p className="text-sm text-neutral-400">Closed</p>
                )}
                {dayRows.map((r) => (
                  <div key={r.key} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={r.start}
                      onChange={(e) => setField(r.key, "start", e.target.value)}
                      className={timeInputClass}
                    />
                    <span className="text-neutral-400">–</span>
                    <input
                      type="time"
                      value={r.end}
                      onChange={(e) => setField(r.key, "end", e.target.value)}
                      className={timeInputClass}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      className="text-sm text-red-600 underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addRow(day.value)}
                  className="text-sm text-neutral-600 underline underline-offset-2"
                >
                  + Add interval
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-neutral-500">
        Times are SGT. A day with no interval is treated as closed. These hours
        only shade the booking calendar (working hours white, outside light
        pink) — they are not enforced, so out-of-hours bookings are still
        allowed.
      </p>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton />
        <Link
          href="/admin"
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Back to dashboard
        </Link>
      </div>
    </form>
  );
}
