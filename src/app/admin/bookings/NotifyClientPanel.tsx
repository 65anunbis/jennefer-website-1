"use client";

import { useState } from "react";

export type MessageTemplate = { key: string; label: string; text: string };

type Props = {
  /** Stored WhatsApp number (digits + country code, no `+`) → wa.me form. */
  whatsappNumber: string;
  /** Dial-friendly display form, e.g. "+65 9123 4567". */
  phoneDisplay: string;
  email: string | null;
  templates: MessageTemplate[];
};

const btn =
  "rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100";
const btnPrimary =
  "rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700";

export function NotifyClientPanel({
  whatsappNumber,
  phoneDisplay,
  email,
  templates,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState(templates[0]?.text ?? "");
  const [copied, setCopied] = useState<string | null>(null);

  function pick(i: number) {
    setIdx(i);
    setText(templates[i].text);
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
    } catch {
      // Clipboard needs a secure (https) context; ignore if unavailable.
    }
  }

  const waHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

  return (
    <div className="space-y-3">
      {templates.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {templates.map((t, i) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pick(i)}
              className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                i === idx
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={btnPrimary}
        >
          Send via WhatsApp
        </a>
        <button type="button" onClick={() => copy("message", text)} className={btn}>
          {copied === "message" ? "Copied ✓" : "Copy message"}
        </button>
        <button
          type="button"
          onClick={() => copy("phone", phoneDisplay)}
          className={btn}
        >
          {copied === "phone" ? "Copied ✓" : "Copy phone"}
        </button>
        {email && (
          <button type="button" onClick={() => copy("email", email)} className={btn}>
            {copied === "email" ? "Copied ✓" : "Copy email"}
          </button>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Opens WhatsApp (from the business number) to {phoneDisplay}, pre-filled —
        review and tap send. Nothing is sent automatically.
      </p>
    </div>
  );
}
