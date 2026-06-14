"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { UserFormState } from "./actions";

type Props = {
  action: (prev: UserFormState, formData: FormData) => Promise<UserFormState>;
  mode: "create" | "edit";
  user?: { name: string; email: string; role: string; isActive: boolean };
  isSelf?: boolean;
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

export function UserForm({ action, mode, user, isSelf }: Props) {
  const [state, formAction] = useFormState(action, {} as UserFormState);
  const isEdit = mode === "edit";

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
          defaultValue={user?.name ?? ""}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={user?.email ?? ""}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Role</span>
        {isSelf ? (
          <>
            {/* Disabled control can't submit; mirror current value via hidden input. */}
            <select
              disabled
              defaultValue={user?.role ?? "admin"}
              className={`${inputClass} bg-neutral-100`}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
            <input type="hidden" name="role" value={user?.role ?? "admin"} />
          </>
        ) : (
          <select
            name="role"
            defaultValue={user?.role ?? "staff"}
            className={inputClass}
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        )}
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">
          {isEdit ? "Set new temporary password (optional)" : "Temporary password"}
        </span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required={!isEdit}
          placeholder={isEdit ? "Leave blank to keep current password" : ""}
          className={inputClass}
        />
        <span className="text-xs text-neutral-500">
          The user will be required to change it on next sign in.
        </span>
      </label>

      {isEdit &&
        (isSelf ? (
          <input type="hidden" name="isActive" value="on" />
        ) : (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={user?.isActive ?? true}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">Active</span>
          </label>
        ))}

      {isSelf && (
        <p className="text-xs text-neutral-500">
          You can’t change your own role or active status.
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={isEdit ? "Save changes" : "Create user"} />
        <Link
          href="/admin/users"
          className="text-sm text-neutral-600 underline underline-offset-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
