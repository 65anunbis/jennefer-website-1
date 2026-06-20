import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { BusinessHoursForm } from "./BusinessHoursForm";
import { saveBusinessHours } from "./actions";

export const dynamic = "force-dynamic";

/** A @db.Time value comes back as a 1970 Date holding the wall-clock in UTC. */
function toHHMM(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default async function BusinessHoursPage() {
  await requireAdmin();

  const hours = await prisma.businessHours.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const initial = hours.map((h) => ({
    dayOfWeek: h.dayOfWeek,
    start: toHHMM(h.startTime),
    end: toHHMM(h.endTime),
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin"
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← Dashboard
      </Link>
      <h1 className="mb-1 mt-1 text-2xl font-semibold">Business hours</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Recurring weekly working hours.
      </p>
      <BusinessHoursForm action={saveBusinessHours} initial={initial} />
    </main>
  );
}
