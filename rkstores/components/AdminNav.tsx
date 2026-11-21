"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: [string, string][] = [["/admin", "Dashboard"], ["/admin/sales", "Daily sales"], ["/admin/sales/analytics", "Sales analytics"], ["/admin/products", "Products"], ["/admin/categories", "Categories"], ["/admin/orders", "Orders"], ["/admin/coupons", "Coupons"], ["/admin/banners", "Banners"], ["/admin/customers", "Customers"], ["/admin/offers", "Offers"], ["/admin/holidays", "Holidays"], ["/admin/notifications", "Notifications"], ["/admin/feedback", "Feedback"], ["/admin/activity-logs", "Activity logs"], ["/admin/settings", "Settings"]];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-2 md:mx-0 md:px-0">
      {NAV.map(([h, l]) => {
        const on = h === "/admin" || h === "/admin/sales" ? path === h : path.startsWith(h);
        return (
          <Link key={h} href={h} aria-current={on ? "page" : undefined}
            className={`admin-pill inline-flex min-h-[44px] shrink-0 items-center rounded-full px-4 text-sm font-medium ${on ? "bg-brand-gradient text-white shadow-soft" : "bg-white/10 text-slate-200 hover:bg-white/20 active:bg-white/25"}`}>{l}</Link>
        );
      })}
    </nav>
  );
}
