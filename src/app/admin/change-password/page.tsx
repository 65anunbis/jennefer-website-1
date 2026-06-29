"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const forced = session?.user?.mustChangePassword ?? false;
  const who = session?.user?.name;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not change password.");
      return;
    }

    // Clear the forced-change flag in the JWT so middleware lets us through.
    await update({ mustChangePassword: false });
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Change password</h1>
          <p className="mt-1 text-sm text-neutral-500">
            For your own account{who ? ` (${who})` : ""}.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
        >
          {forced && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Please set a new password before continuing.
            </p>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <label className="block space-y-1">
            <span className="text-sm font-medium">Current password</span>
            <input
              type={showPw ? "text" : "password"}
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">New password</span>
            <input
              type={showPw ? "text" : "password"}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Confirm new password</span>
            <input
              type={showPw ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={showPw}
              onChange={(e) => setShowPw(e.target.checked)}
              className="h-4 w-4"
            />
            Show passwords
          </label>

          <div className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            <p className="font-medium text-neutral-700">Tips for a strong password</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Use at least 12 characters — a memorable passphrase works well.</li>
              <li>Mix words, numbers and symbols; avoid names or birthdays.</li>
              <li>Don’t reuse a password from another site.</li>
              <li>Keep it private; never share it over chat or email.</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Update password"}
          </button>

          {!forced && (
            <Link
              href="/admin"
              className="block w-full rounded-md border border-neutral-300 bg-white px-4 py-2 text-center text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-100"
            >
              ← Cancel and go back to Dashboard
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
