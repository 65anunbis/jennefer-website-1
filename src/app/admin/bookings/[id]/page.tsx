import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatTimeSGT } from "@/lib/datetime";
import { BookingForm } from "../BookingForm";
import { DeleteBookingButton } from "../DeleteBookingButton";
import { updateBooking, deleteBooking } from "../actions";
import { loadBookingFormOptions } from "../options";

export const dynamic = "force-dynamic";

export default async function EditBookingPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();

  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) notFound();

  const { clients, packages, venues } = await loadBookingFormOptions(
    booking.clientPackageId,
  );

  const updateAction = updateBooking.bind(null, id);
  const deleteAction = deleteBooking.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm hover:bg-neutral-100"
      >
        ← Bookings
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold">Edit booking</h1>
      <BookingForm
        mode="edit"
        action={updateAction}
        clients={clients}
        packages={packages}
        venues={venues}
        booking={{
          clientId: booking.clientId,
          clientPackageId: booking.clientPackageId,
          deliveryType: booking.deliveryType,
          venueId: booking.venueId,
          zoomJoinUrl: booking.zoomJoinUrl ?? "to arrange manually",
          scheduledDate: booking.scheduledDate.toISOString().slice(0, 10),
          scheduledTime: formatTimeSGT(booking.scheduledTime),
          durationMinutes: booking.durationMinutes,
          status: booking.status,
          bookingNotes: booking.bookingNotes ?? "",
        }}
      />

      <div className="mt-8 border-t border-neutral-200 pt-6">
        <DeleteBookingButton action={deleteAction} />
        <p className="mt-2 text-xs text-neutral-500">
          Deleting frees the session back to its package. To keep the record,
          set the status to Cancelled instead.
        </p>
      </div>
    </main>
  );
}
