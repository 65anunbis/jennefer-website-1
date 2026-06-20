"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

export type FormState = { error?: string; success?: boolean };

export type IntervalInput = {
  dayOfWeek: number; // 0=Sun … 6=Sat
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

/** Parse "HH:MM" → minutes since midnight, or null if malformed. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** A wall-clock time stored in a @db.Time column (epoch date, UTC time). */
function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

export async function saveBusinessHours(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  let intervals: IntervalInput[];
  try {
    intervals = JSON.parse(String(formData.get("intervals") ?? "[]"));
  } catch {
    return { error: "Could not read the submitted hours." };
  }
  if (!Array.isArray(intervals)) return { error: "Invalid hours data." };

  // Validate each interval, then check for overlaps within each day.
  const byDay = new Map<number, { start: number; end: number }[]>();
  for (const iv of intervals) {
    if (!Number.isInteger(iv.dayOfWeek) || iv.dayOfWeek < 0 || iv.dayOfWeek > 6)
      return { error: "Invalid day of week." };
    const start = toMinutes(iv.start);
    const end = toMinutes(iv.end);
    if (start === null || end === null)
      return { error: "Every interval needs a valid start and end time." };
    if (start >= end)
      return { error: "Each interval's start must be before its end." };
    const list = byDay.get(iv.dayOfWeek) ?? [];
    list.push({ start, end });
    byDay.set(iv.dayOfWeek, list);
  }

  for (const list of Array.from(byDay.values())) {
    const sorted = [...list].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end)
        return { error: "Intervals on the same day must not overlap." };
    }
  }

  // Replace the whole set (interval model; small data; simplest + atomic).
  await prisma.$transaction(async (tx) => {
    await tx.businessHours.deleteMany();
    if (intervals.length > 0) {
      await tx.businessHours.createMany({
        data: intervals.map((iv) => ({
          dayOfWeek: iv.dayOfWeek,
          startTime: hhmmToDate(iv.start),
          endTime: hhmmToDate(iv.end),
        })),
      });
    }
  });

  await recordAudit(
    "update",
    "business_hours",
    null,
    `Updated business hours (${intervals.length} interval${intervals.length === 1 ? "" : "s"})`,
  );
  revalidatePath("/admin/business-hours");
  return { success: true };
}
