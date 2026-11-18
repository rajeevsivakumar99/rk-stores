import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import { signOut } from "@/app/actions";
import { isAdminRole } from "@/lib/util";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile || !isAdminRole(profile.role)) redirect("/login?next=/admin");
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
      <main className="mx-auto max-w-6xl animate-fade-up px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 md:px-4 md:py-5">{children}</main>
    </div>
  );
}
