"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  serviceId: number;
  pkg?: {
    name: string;
    priceSgd: string;
    durationMinutes: number;
    sessionsCount: number;
    deliveryType: string;
    description: string | null;
    active: boolean;
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

export function PackageForm({ action, mode, serviceId, pkg }: Props) {
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
          defaultValue={pkg?.name ?? ""}
          placeholder="e.g. 3 Sessions (10% off)"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Price (SGD)</span>
          <input
            name="priceSgd"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={pkg?.priceSgd ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Delivery</span>
          <select
            name="deliveryType"
            defaultValue={pkg?.deliveryType ?? "in_person"}
            className={inputClass}
          >
            <option value="in_person">In person</option>
            <option value="zoom">Zoom</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Duration (minutes)</span>
          <input
            name="durationMinutes"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={pkg?.durationMinutes ?? 60}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Sessions in package</span>
          <input
            name="sessionsCount"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={pkg?.sessionsCount ?? 1}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Description</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={pkg?.description ?? ""}
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={pkg?.active ?? true}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">Active (bookable / shown publicly)</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={mode === "edit" ? "Save changes" : "Add package"} />
        <Link
          href={`/admin/services/${serviceId}`}
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
