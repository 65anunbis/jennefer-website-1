import type { Metadata } from "next";
import { AdminProviders } from "./providers";

export const metadata: Metadata = {
  title: "Admin — Jennefer Wong",
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
