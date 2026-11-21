import Link from "next/link";
import { getSettings, getProfile, getUnread, getCartCount } from "@/lib/data";
import { signOut } from "@/app/actions";
import { isAdminRole } from "@/lib/util";
import NotificationBell from "./NotificationBell";
import { Icon } from "./Icons";

export default async function Header() {
  const [s, profile, unread, cartCount] = await Promise.all([getSettings(), getProfile(), getUnread(), getCartCount()]);
  const admin = isAdminRole(profile?.role);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 md:h-16 md:px-4">
        <Link href="/" className="flex min-h-[44px] min-w-0 items-center gap-2.5">
          {s?.logo_url
            ? <img src={s.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-soft md:h-10 md:w-10" />
            : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-extrabold text-white shadow-soft md:h-10 md:w-10">RK</span>}
          <span className="truncate text-base font-extrabold tracking-tight text-slate-900 md:text-lg">{s?.store_name ?? "RK Stores"}</span>
        </Link>
        {/* Desktop/tablet search; phones use the Search tab and the search box on the home page */}
        <form action="/products" className="mx-4 hidden max-w-md flex-1 md:flex">
          <input name="q" placeholder="Search products…" className="input !rounded-r-none" aria-label="Search products" />
          <button className="btn !rounded-l-none" aria-label="Search"><Icon name="search" className="h-5 w-5" /></button>
        </form>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
          <Link href="/products" className="nav-link hidden lg:inline-flex">Products</Link>
          <Link href="/offers" className="nav-link hidden lg:inline-flex">Offers</Link>
          <Link href="/#contact" className="nav-link hidden lg:inline-flex">Contact</Link>
          {profile ? (
            <>
              <Link href="/cart" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`} className="nav-link relative !px-2.5">
                <Icon name="cart" className="h-6 w-6" />
                {cartCount > 0 && <span className="absolute right-0 top-1 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
              </Link>
              <NotificationBell userId={profile.id} initial={unread} />
              {admin && <Link href="/admin" className="btn !min-h-[40px] hidden !px-4 lg:inline-flex">⚙️ Admin</Link>}
              <Link href="/account" className="nav-link hidden lg:inline-flex">Account</Link>
              <form action={signOut} className="hidden lg:block"><button className="nav-link">Log out</button></form>
            </>
          ) : (
            <Link href="/login" className="btn !px-4"><span>Login<span className="hidden sm:inline"> / Register</span></span></Link>
          )}
        </nav>
      </div>
    </header>
  );
}
