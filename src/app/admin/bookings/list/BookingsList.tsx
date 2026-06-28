"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type BookingItem = {
  id: number;
  clientName: string;
  whatsapp: string;
  dateIso: string;
  time: string;
  startMin: number;
  status: string;
  delivery: string;
  package: string;
  conflicts: string[];
};

export type BlockItem = {
  id: number;
  title: string;
  type: string;
  startIso: string;
  endIso: string;
  startMin: number | null;
  allDay: boolean;
  span: string;
};

type Props = { bookings: BookingItem[]; blocks: BlockItem[]; today: string };

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};
const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  completed: "bg-green-50 text-green-700 ring-1 ring-green-200",
  cancelled: "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200",
  no_show: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const pad = (n: number) => String(n).padStart(2, "0");

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
function addDaysIso(iso: string, n: number): string {
  const dt = new Date(`${iso}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
function monthBounds(iso: string): [string, string] {
  const [y, m] = iso.split("-").map(Number);
  const end = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(end)}`];
}
function weekBounds(iso: string): [string, string] {
  const dt = new Date(`${iso}T00:00:00.000Z`);
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  const start = addDaysIso(iso, -dow);
  return [start, addDaysIso(start, 6)];
}

const PERIODS = [
  ["all", "All"],
  ["month", "Month"],
  ["week", "Week"],
  ["day", "Day"],
] as const;
type Period = (typeof PERIODS)[number][0];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] ?? "bg-neutral-100 text-neutral-600"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

type Row =
  | { kind: "block"; sort: number; blk: BlockItem }
  | { kind: "booking"; sort: number; b: BookingItem };

export function BookingsList({ bookings, blocks, today }: Props) {
  const [period, setPeriod] = useState<Period>("all");
  const [anchor, setAnchor] = useState(today);
  const [q, setQ] = useState("");

  const range = useMemo<[string, string]>(() => {
    if (period === "month") return monthBounds(anchor);
    if (period === "week") return weekBounds(anchor);
    if (period === "day") return [anchor, anchor];
    const all = [
      ...bookings.map((b) => b.dateIso),
      ...blocks.map((b) => b.startIso),
      ...blocks.map((b) => b.endIso),
    ];
    if (all.length === 0) return [today, today];
    return [
      all.reduce((a, b) => (a < b ? a : b)),
      all.reduce((a, b) => (a > b ? a : b)),
    ];
  }, [period, anchor, bookings, blocks, today]);

  const qq = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const [lo, hi] = range;
    const matchBookings = bookings.filter(
      (b) =>
        b.dateIso >= lo &&
        b.dateIso <= hi &&
        (qq === "" || b.clientName.toLowerCase().includes(qq)),
    );
    // Dates to show = days with a matching booking, plus every day a block
    // covers within the range (blocks are never hidden by the client search).
    const dates = new Set<string>();
    for (const b of matchBookings) dates.add(b.dateIso);
    for (const blk of blocks) {
      const s = blk.startIso < lo ? lo : blk.startIso;
      const e = blk.endIso > hi ? hi : blk.endIso;
      if (s > e) continue;
      for (let d = s; d <= e; d = addDaysIso(d, 1)) dates.add(d);
    }
    const sorted = Array.from(dates).sort().reverse(); // newest first

    return sorted.map((date) => {
      const items: Row[] = [];
      for (const blk of blocks) {
        if (blk.startIso <= date && date <= blk.endIso) {
          const timedToday =
            !blk.allDay && blk.startIso === date && blk.startMin != null;
          items.push({ kind: "block", sort: timedToday ? blk.startMin! : -1, blk });
        }
      }
      for (const b of matchBookings) {
        if (b.dateIso === date) items.push({ kind: "booking", sort: b.startMin, b });
      }
      items.sort((x, y) => x.sort - y.sort); // all-day blocks (-1) first
      return { date, items };
    });
  }, [bookings, blocks, range, qq]);

  const pill = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-700 hover:bg-neutral-100"}`;

  return (
    <div className="mt-4">
      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPeriod(val)}
              className={pill(period === val)}
            >
              {label}
            </button>
          ))}
          {period !== "all" && (
            <input
              type="date"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-900"
            />
          )}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search client name…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 sm:max-w-xs"
        />
      </div>

      {/* Mobile: stacked cards */}
      <div className="mt-4 space-y-6 sm:hidden">
        {groups.map((g) => (
          <section key={g.date}>
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {fmtDate(g.date)}
              {g.date === today && (
                <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                  Today
                </span>
              )}
            </h2>
            <div className="mt-2 space-y-2">
              {g.items.map((it) =>
                it.kind === "block" ? (
                  <BlockCard key={`blk-${it.blk.id}-${g.date}`} blk={it.blk} />
                ) : (
                  <BookingCard key={`bk-${it.b.id}`} b={it.b} />
                ),
              )}
            </div>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-neutral-500">
            Nothing matches.
          </p>
        )}
      </div>

      {/* Desktop: table */}
      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Time (SGT)</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.date} className="divide-y divide-neutral-100">
              <tr className={g.date === today ? "bg-blue-50" : "bg-neutral-50"}>
                <td
                  colSpan={7}
                  className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wide ${g.date === today ? "text-blue-700" : "text-neutral-500"}`}
                >
                  {fmtDate(g.date)}
                  {g.date === today && (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5">
                      Today
                    </span>
                  )}
                </td>
              </tr>
              {g.items.map((it) =>
                it.kind === "block" ? (
                  <BlockRow key={`blk-${it.blk.id}-${g.date}`} blk={it.blk} />
                ) : (
                  <BookingRow key={`bk-${it.b.id}`} b={it.b} />
                ),
              )}
            </tbody>
          ))}
          {groups.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  Nothing matches.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}

function BookingCard({ b }: { b: BookingItem }) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-3 shadow-sm ${b.status === "cancelled" ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{b.clientName}</p>
          <p className="text-sm text-neutral-500">{b.time} SGT</p>
        </div>
        <StatusBadge status={b.status} />
      </div>
      {b.conflicts.length > 0 && (
        <p className="mt-1 text-xs font-medium text-amber-700">
          ⚠ Overlaps {b.conflicts.join(", ")}
        </p>
      )}
      <p className="mt-1 text-sm text-neutral-600">
        {b.delivery} · {b.package}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-neutral-400">{b.whatsapp}</span>
        <Link
          href={`/admin/bookings/${b.id}`}
          className="text-sm font-medium text-neutral-900 underline underline-offset-2"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

function BlockCard({ blk }: { blk: BlockItem }) {
  return (
    <Link
      href={`/admin/blocks/${blk.id}`}
      className="block rounded-xl border border-purple-200 bg-purple-50 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-purple-900">
            <span className="mr-1 rounded bg-purple-200 px-1.5 py-0.5 text-xs">
              Block
            </span>
            {blk.title}
          </p>
          <p className="text-sm text-purple-700">{blk.span}</p>
        </div>
        <span className="shrink-0 text-xs text-purple-500">{blk.type}</span>
      </div>
    </Link>
  );
}

function BookingRow({ b }: { b: BookingItem }) {
  return (
    <tr
      className={`hover:bg-neutral-50 ${b.status === "cancelled" ? "text-neutral-400" : ""}`}
    >
      <td className="px-4 py-3">{b.time}</td>
      <td className="px-4 py-3 font-medium">
        {b.clientName}
        {b.conflicts.length > 0 && (
          <span className="block text-xs font-normal text-amber-700">
            ⚠ Overlaps {b.conflicts.join(", ")}
          </span>
        )}
      </td>
      <td className="px-4 py-3">{b.whatsapp}</td>
      <td className="px-4 py-3">
        <StatusBadge status={b.status} />
      </td>
      <td className="px-4 py-3">{b.delivery}</td>
      <td className="px-4 py-3">{b.package}</td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/bookings/${b.id}`}
          className="underline underline-offset-2"
        >
          Edit
        </Link>
      </td>
    </tr>
  );
}

function BlockRow({ blk }: { blk: BlockItem }) {
  return (
    <tr className="bg-purple-50">
      <td colSpan={7} className="px-4 py-2">
        <Link
          href={`/admin/blocks/${blk.id}`}
          className="flex items-center justify-between gap-3 text-purple-900 hover:underline"
        >
          <span>
            <span className="mr-2 rounded bg-purple-200 px-1.5 py-0.5 text-xs font-medium">
              Block
            </span>
            <span className="font-medium">{blk.title}</span>
            <span className="text-purple-500"> · {blk.type}</span>
          </span>
          <span className="shrink-0 text-purple-700">{blk.span}</span>
        </Link>
      </td>
    </tr>
  );
}
