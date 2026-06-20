"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "./actions";

type PackageOption = {
  id: number;
  label: string;
  priceSgd: string;
  sessionsCount: number;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  cancelHref: string;
  packages?: PackageOption[];
  today?: string;
  purchase?: {
    packageLabel: string;
    sessionsTotal: number;
    pricePaidSgd: string;
    purchasedDate: string;
    status: "active" | "completed" | "cancelled";
    paid: boolean;
    paymentMode: "paynow" | "bank_transfer" | "cash" | "credit_card";
    paidDate: string;
    notes: string;
  };
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

const PAYMENT_MODE_OPTIONS = [
  { value: "paynow", label: "PayNow" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit card" },
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

export function PurchaseForm({
  action,
  mode,
  cancelHref,
  packages = [],
  today,
  purchase,
}: Props) {
  const [state, formAction] = useFormState(action, {} as FormState);
  const [price, setPrice] = useState(purchase?.pricePaidSgd ?? "");
  const [sessions, setSessions] = useState<number | null>(
    purchase?.sessionsTotal ?? null,
  );

  function onPackageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const pkg = packages.find((p) => String(p.id) === e.target.value);
    if (pkg) {
      setPrice(pkg.priceSgd);
      setSessions(pkg.sessionsCount);
    } else {
      setSessions(null);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {mode === "create" ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Package</span>
          <select
            name="packageId"
            required
            defaultValue=""
            onChange={onPackageChange}
            className={inputClass}
          >
            <option value="" disabled>
              — Choose a package —
            </option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — ${p.priceSgd} · {p.sessionsCount} session
                {p.sessionsCount === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          {sessions !== null && (
            <span className="text-xs text-neutral-500">
              {sessions} session{sessions === 1 ? "" : "s"} will be added to this
              client.
            </span>
          )}
        </label>
      ) : (
        <div className="space-y-1">
          <span className="text-sm font-medium">Package</span>
          <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm">
            {purchase?.packageLabel} · {purchase?.sessionsTotal} session
            {purchase?.sessionsTotal === 1 ? "" : "s"}
          </p>
          <span className="text-xs text-neutral-500">
            The package and session total are fixed at purchase time.
          </span>
        </div>
      )}

      {mode === "edit" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Status</span>
          <select
            name="status"
            defaultValue={purchase?.status ?? "active"}
            className={inputClass}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Price paid (SGD)</span>
          <input
            name="pricePaidSgd"
            type="number"
            min="0"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Purchased date</span>
          <input
            name="purchasedDate"
            type="date"
            required
            defaultValue={purchase?.purchasedDate ?? today ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Payment mode</span>
          <select
            name="paymentMode"
            defaultValue={purchase?.paymentMode ?? "paynow"}
            className={inputClass}
          >
            {PAYMENT_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Paid date (optional)</span>
          <input
            name="paidDate"
            type="date"
            defaultValue={purchase?.paidDate ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="paid"
          defaultChecked={purchase?.paid ?? false}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium">Paid</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={purchase?.notes ?? ""}
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton
          label={mode === "edit" ? "Save changes" : "Record purchase"}
        />
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
