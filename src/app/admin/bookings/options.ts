import { prisma } from "@/lib/db";
import { sessionsRemaining } from "@/lib/sessions";
import { formatDateSGT } from "@/lib/datetime";
import type {
  ClientOption,
  PackageOption,
  VenueOption,
} from "./BookingForm";

/**
 * Load the dropdown data the booking form needs: all clients, all venues, and
 * the bookable packages with their computed sessions-remaining. Active packages
 * are always included; `includePackageId` additionally pulls in one specific
 * package (the one a booking being edited is linked to) even if it is no longer
 * active, so the edit form can still show its current selection.
 */
export async function loadBookingFormOptions(
  includePackageId?: number | null,
): Promise<{
  clients: ClientOption[];
  packages: PackageOption[];
  venues: VenueOption[];
}> {
  const [clients, venues, pkgRows] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.venue.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.clientPackage.findMany({
      where: includePackageId
        ? { OR: [{ status: "active" }, { id: includePackageId }] }
        : { status: "active" },
      orderBy: { purchasedDate: "asc" },
      include: {
        package: { include: { service: true } },
        bookings: { select: { status: true } },
      },
    }),
  ]);

  const packages: PackageOption[] = pkgRows.map((p) => ({
    id: p.id,
    clientId: p.clientId,
    label: `${p.package.service.name} — ${p.package.name} (bought ${formatDateSGT(p.purchasedDate)})`,
    remaining: sessionsRemaining(
      p.sessionsTotal,
      p.bookings.map((b) => b.status),
    ),
    deliveryType: p.package.deliveryType,
    durationMinutes: p.package.durationMinutes,
  }));

  return { clients, packages, venues };
}
