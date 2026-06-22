"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type ClientRow = {
  id: number;
  name: string;
  whatsapp: string;
  email: string | null;
  packagesCount: number;
  unused: number;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** First-letter bucket for grouping/index: A–Z, or "#" for anything else. */
function bucket(name: string): string {
  const c = name.trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(c) ? c : "#";
}

export function ClientDirectory({ rows }: { rows: ClientRow[] }) {
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("All");

  // Which buckets actually have clients (drives which index letters are active).
  const present = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(bucket(r.name));
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return rows.filter((r) => r.name.toLowerCase().includes(q));
    if (letter !== "All") return rows.filter((r) => bucket(r.name) === letter);
    return rows;
  }, [rows, query, letter]);

  // Group consecutive rows (already name-sorted) by their letter bucket.
  const groups = useMemo(() => {
    const out: { key: string; items: ClientRow[] }[] = [];
    for (const r of filtered) {
      const key = bucket(r.name);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(r);
      else out.push({ key, items: [r] });
    }
    return out;
  }, [filtered]);

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) setLetter("All"); // search overrides the letter filter
          }}
          placeholder="Search by name…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 sm:max-w-xs"
        />
      </div>

      {/* A–Z index */}
      <div className="mt-3 flex flex-wrap gap-1 text-xs">
        {["All", ...LETTERS].map((l) => {
          const active = letter === l && !query;
          const enabled = l === "All" || present.has(l);
          return (
            <button
              key={l}
              type="button"
              disabled={!enabled}
              onClick={() => {
                setLetter(l);
                setQuery("");
              }}
              className={[
                "rounded px-1.5 py-0.5",
                active
                  ? "bg-neutral-900 text-white"
                  : enabled
                    ? "text-neutral-700 hover:bg-neutral-100"
                    : "cursor-default text-neutral-300",
              ].join(" ")}
            >
              {l}
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Packages</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Bookings unused</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {groups.map((g) => (
              <Group key={g.key} groupKey={g.key} items={g.items} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  {rows.length === 0 ? "No clients yet." : "No matching clients."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Group({ groupKey, items }: { groupKey: string; items: ClientRow[] }) {
  return (
    <>
      <tr className="bg-neutral-50">
        <td
          colSpan={6}
          className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          {groupKey}
        </td>
      </tr>
      {items.map((c) => (
        <tr key={c.id}>
          <td className="px-4 py-3 font-medium">{c.name}</td>
          <td className="px-4 py-3">{c.whatsapp}</td>
          <td className="hidden px-4 py-3 sm:table-cell">{c.email ?? "—"}</td>
          <td className="hidden px-4 py-3 sm:table-cell">{c.packagesCount}</td>
          <td className="hidden px-4 py-3 sm:table-cell">{c.unused}</td>
          <td className="px-4 py-3 text-right">
            <Link
              href={`/admin/clients/${c.id}`}
              className="underline underline-offset-2"
            >
              View
            </Link>
          </td>
        </tr>
      ))}
    </>
  );
}
