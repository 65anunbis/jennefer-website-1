"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  cancelHref: string;
  client?: {
    name: string;
    whatsappNumber: string;
    email: string | null;
    notes: string | null;
    additionalId: string | null;
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

export function ClientForm({ action, mode, cancelHref, client }: Props) {
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
          defaultValue={client?.name ?? ""}
          placeholder="e.g. Amanda Lim"
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">WhatsApp number</span>
        <input
          name="whatsappNumber"
          type="tel"
          required
          defaultValue={client?.whatsappNumber ?? ""}
          placeholder="e.g. 9123 4567 or +65 9123 4567"
          className={inputClass}
        />
        <span className="text-xs text-neutral-500">
          Stored as digits with country code. A bare 8-digit number is treated
          as Singapore (+65).
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Email (optional)</span>
        <input
          name="email"
          type="email"
          defaultValue={client?.email ?? ""}
          placeholder="e.g. amanda@example.com"
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ""}
          placeholder="General context — preferences, referral source, background."
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Additional ID (optional)</span>
        <input
          name="additionalId"
          type="text"
          defaultValue={client?.additionalId ?? ""}
          placeholder="e.g. NRIC / passport — for future use"
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={mode === "edit" ? "Save changes" : "Create client"} />
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
