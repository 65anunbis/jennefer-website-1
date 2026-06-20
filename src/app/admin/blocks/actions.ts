"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import type { BlockType } from "@/generated/prisma/enums";

export type FormState = { error?: string };

const BLOCK_TYPES: BlockType[] = [
  "vacation",
  "training",
  "team_event",
  "personal",
  "public_holiday",
  "other",
];

/** Parse a "YYYY-MM-DD" date input into a UTC-midnight Date (for @db.Date). */
function parseDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse "HH:MM" → a @db.Time value (epoch date, UTC), or null if malformed. */
function parseTime(v: FormDataEntryValue | null): Date | null {
  const m = /^(\d{2}):(\d{2})$/.exec(String(v ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return new Date(Date.UTC(1970, 0, 1, h, min, 0));
}

type BlockInput = {
  blockType: BlockType;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  startTime: Date | null;
  endTime: Date | null;
  notes: string | null;
  venueId: number | null;
};

async function readInput(
  formData: FormData,
): Promise<{ ok: true; value: BlockInput } | { ok: false; error: string }> {
  const blockTypeRaw = String(formData.get("blockType") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const startDate = parseDate(formData.get("startDate"));
  const endDate = parseDate(formData.get("endDate"));
  const allDay = formData.get("allDay") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const venueRaw = String(formData.get("venueId") ?? "").trim();

  if (!BLOCK_TYPES.includes(blockTypeRaw as BlockType))
    return { ok: false, error: "Please choose a block type." };
  if (!title) return { ok: false, error: "Title is required." };
  if (!startDate || !endDate)
    return { ok: false, error: "Valid start and end dates are required." };
  if (endDate.getTime() < startDate.getTime())
    return { ok: false, error: "End date must be on or after the start date." };

  let startTime: Date | null = null;
  let endTime: Date | null = null;
  if (!allDay) {
    startTime = parseTime(formData.get("startTime"));
    endTime = parseTime(formData.get("endTime"));
    if (!startTime || !endTime)
      return { ok: false, error: "A timed block needs a valid start and end time." };
    if (startTime.getTime() >= endTime.getTime())
      return { ok: false, error: "Start time must be before end time." };
  }

  let venueId: number | null = null;
  if (venueRaw !== "") {
    venueId = Number(venueRaw);
    if (!Number.isInteger(venueId))
      return { ok: false, error: "Invalid venue." };
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) return { ok: false, error: "Selected venue no longer exists." };
  }

  return {
    ok: true,
    value: {
      blockType: blockTypeRaw as BlockType,
      title,
      startDate,
      endDate,
      allDay,
      startTime,
      endTime,
      notes: notes || null,
      venueId,
    },
  };
}

export async function createBlock(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = await readInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const created = await prisma.calendarBlock.create({
    data: { ...v, createdBy: Number(user.id) },
  });

  await recordAudit(
    "create",
    "calendar_block",
    created.id,
    `Created block: ${v.blockType}`,
  );
  revalidatePath("/admin/blocks");
  redirect("/admin/blocks");
}

export async function updateBlock(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const target = await prisma.calendarBlock.findUnique({ where: { id } });
  if (!target) return { error: "Block not found." };

  const parsed = await readInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const v = parsed.value;

  const changed: string[] = [];
  if (v.blockType !== target.blockType) changed.push("block_type");
  if (v.title !== target.title) changed.push("title");
  if (v.startDate.getTime() !== target.startDate.getTime()) changed.push("start_date");
  if (v.endDate.getTime() !== target.endDate.getTime()) changed.push("end_date");
  if (v.allDay !== target.allDay) changed.push("all_day");
  if ((v.startTime?.getTime() ?? null) !== (target.startTime?.getTime() ?? null))
    changed.push("start_time");
  if ((v.endTime?.getTime() ?? null) !== (target.endTime?.getTime() ?? null))
    changed.push("end_time");
  if (v.notes !== target.notes) changed.push("notes");
  if (v.venueId !== target.venueId) changed.push("venue_id");

  await prisma.calendarBlock.update({ where: { id }, data: v });

  await recordAudit(
    "update",
    "calendar_block",
    id,
    changed.length ? `Updated: ${changed.join(", ")}` : "No changes",
  );
  revalidatePath("/admin/blocks");
  redirect("/admin/blocks");
}

export async function deleteBlock(id: number, _formData: FormData): Promise<void> {
  await requireUser();

  const target = await prisma.calendarBlock.findUnique({ where: { id } });
  if (target) {
    await prisma.calendarBlock.delete({ where: { id } });
    await recordAudit(
      "delete",
      "calendar_block",
      id,
      `Deleted block: ${target.blockType}`,
    );
  }
  revalidatePath("/admin/blocks");
  redirect("/admin/blocks");
}
