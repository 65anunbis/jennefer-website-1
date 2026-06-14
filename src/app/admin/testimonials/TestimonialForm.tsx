"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  services: { id: number; name: string }[];
  testimonial?: {
    clientName: string;
    serviceId: number | null;
    quote: string;
    visible: boolean;
    sortOrder: number;
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

export function TestimonialForm({ action, mode, services, testimonial }: Props) {
  const [state, formAction] = useFormState(action, {} as FormState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Client name</span>
        <input
          name="clientName"
          type="text"
          required
          defaultValue={testimonial?.clientName ?? ""}
          placeholder="e.g. Amanda L."
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Service (optional)</span>
        <select
          name="serviceId"
          defaultValue={testimonial?.serviceId?.toString() ?? ""}
          className={inputClass}
        >
          <option value="">— None —</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Quote</span>
        <textarea
          name="quote"
          rows={4}
          required
          defaultValue={testimonial?.quote ?? ""}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Sort order</span>
        <input
          name="sortOrder"
          type="number"
          min="0"
          step="1"
          defaultValue={testimonial?.sortOrder ?? 0}
          className={inputClass}
        />
        <span className="text-xs text-neutral-500">
          Lower numbers appear first on the public page.
        </span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="visible"
          defaultChecked={testimonial?.visible ?? true}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">Visible on the public site</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton
          label={mode === "edit" ? "Save changes" : "Create testimonial"}
        />
        <Link
          href="/admin/testimonials"
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
