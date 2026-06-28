import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { todaySGT } from "@/lib/datetime";
import { BookingForm } from "../BookingForm";
import { createBooking } from "../actions";
import { loadBookingFormOptions } from "../options";

export const dynamic = "force-dynamic";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { date?: string; time?: string; clientId?: string };
}) {
  await requireUser();
  const { clients, packages, venues } = await loadBookingFormOptions();

  const clientIdNum = Number(searchParams.clientId);
  const defaultClientId = Number.isInteger(clientIdNum) && clientIdNum > 0
    ? clientIdNum
    : undefined;

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Bookings
        </Link>
      </div>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">New booking</h1>
      <BookingForm
        mode="create"
        action={createBooking}
        clients={clients}
        packages={packages}
        venues={venues}
        defaultClientId={defaultClientId}
        defaultDate={searchParams.date ?? todaySGT()}
        defaultTime={searchParams.time}
      />
      <div className="flex flex-wrap gap-2 mt-10 border-t border-neutral-200 pt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Dashboard
        </Link>
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
        >
          ← Bookings
        </Link>
      </div>
    </main>
  );
}
