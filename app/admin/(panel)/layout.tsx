import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import { signOut } from "@/app/actions";
import { isAdminRole } from "@/lib/util";
import AdminNav from "@/components/AdminNav";
import { supabaseServer } from "@/lib/supabase/server";
import { getSalesStatus } from "@/lib/sales-reminders";
import { fmtLeft } from "@/lib/sales-logic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile || !isAdminRole(profile.role)) redirect("/login?next=/admin");
  // Reminder strip: shown on every admin page while today's GPay + Cash entry is still missing in the last 2 hours of the day.
  const sales = await getSalesStatus(supabaseServer()).catch(() => null);
  const showSales = !!sales && sales.shopDay && !sales.entered && sales.minsLeft <= 120;
  const urgent = !!sales && sales.minsLeft <= 30;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-slate-900 to-brand-900 pt-[env(safe-area-inset-top)] text-white shadow-lift">
        <div className="mx-auto max-w-6xl px-3 md:px-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 py-2 font-extrabold tracking-tight"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-xs">RK</span>Admin</span>
            <div className="flex items-center text-sm">
              <Link href="/" className="touch-link px-3 hover:underline">View site</Link>
              <form action={signOut}><button className="touch-link px-3 hover:underline">Log out</button></form>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      {showSales && sales && (
        <Link href="/admin/sales" className={`block px-3 py-2.5 text-center text-sm font-semibold text-white ${urgent ? "animate-pulse bg-red-600" : "bg-amber-500"}`}>
          {urgent ? "🚨 URGENT: " : "⏰ "}Today&apos;s sales (GPay + Cash) are not entered yet - {sales.minsLeft > 0 ? `${fmtLeft(sales.minsLeft)} left. ` : "the day has ended. "}Tap to enter →
        </Link>
      )}
      <main className="mx-auto max-w-6xl animate-fade-up px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 md:px-4 md:py-5">{children}</main>
    </div>
  );
}
