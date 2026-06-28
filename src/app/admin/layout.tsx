import type { Metadata } from "next";
import { AdminProviders } from "./providers";

export const metadata: Metadata = {
  // Child pages set a short title (e.g. "Bookings") → tab reads "JW-Bookings".
  title: { template: "JW-%s", default: "JW-Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProviders>
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        {children}
      </div>
    </AdminProviders>
  );
}
