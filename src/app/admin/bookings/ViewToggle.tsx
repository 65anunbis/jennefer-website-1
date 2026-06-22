import Link from "next/link";

/** Calendar | List switch shown at the top of both Bookings views. */
export function ViewToggle({ active }: { active: "calendar" | "list" }) {
  const base =
    "rounded-md px-3 py-1.5 text-sm font-medium";
  const on = "bg-neutral-900 text-white";
  const off = "border border-neutral-300 text-neutral-700 hover:bg-neutral-100";
  return (
    <div className="mt-4 flex gap-2">
      <Link
        href="/admin/bookings"
        className={`${base} ${active === "calendar" ? on : off}`}
      >
        Calendar
      </Link>
      <Link
        href="/admin/bookings/list"
        className={`${base} ${active === "list" ? on : off}`}
      >
        List
      </Link>
    </div>
  );
}
