"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { toMinutes, diffIntervals } from "@/lib/business-hours";

export type FormState = { error?: string; success?: boolean };

export type IntervalInput = {
  dayOfWeek: number; // 0=Sun … 6=Sat
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

/** A @db.Time value comes back as a 1970 Date holding the wall-clock in UTC. */
function timeToMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Build a @db.Time value (epoch date, UTC) from minutes since midnight. */
function minutesToTime(min: number): Date {
  return new Date(Date.UTC(1970, 0, 1, 0, min, 0));
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

  // Validate each interval, building the desired set in minutes as we go.
  const byDay = new Map<number, { start: number; end: number }[]>();
  const desired: { dayOfWeek: number; startMin: number; endMin: number }[] = [];
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
    desired.push({ dayOfWeek: iv.dayOfWeek, startMin: start, endMin: end });
  }

  // No overlapping intervals within the same day.
  for (const list of Array.from(byDay.values())) {
    const sorted = [...list].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end)
        return { error: "Intervals on the same day must not overlap." };
    }
  }

  // Set-difference sync: only delete removed intervals and insert added ones,
  // leaving unchanged rows (and their created_at / id) untouched.
  const existing = await prisma.businessHours.findMany();
  const { toDeleteIds, toInsert } = diffIntervals(
    existing.map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      startMin: timeToMinutes(r.startTime),
      endMin: timeToMinutes(r.endTime),
    })),
    desired,
  );

  if (toDeleteIds.length === 0 && toInsert.length === 0) {
    return { success: true };
  }

  await prisma.$transaction(async (tx) => {
    if (toDeleteIds.length > 0) {
      await tx.businessHours.deleteMany({ where: { id: { in: toDeleteIds } } });
    }
    if (toInsert.length > 0) {
      await tx.businessHours.createMany({
        data: toInsert.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          startTime: minutesToTime(d.startMin),
          endTime: minutesToTime(d.endMin),
        })),
      });
    }
  });

  await recordAudit(
    "update",
    "business_hours",
    null,
    `Updated business hours (+${toInsert.length} / -${toDeleteIds.length})`,
  );
  revalidatePath("/admin/business-hours");
  return { success: true };
}
