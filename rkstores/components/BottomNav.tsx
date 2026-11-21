"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";

export default function BottomNav({ loggedIn, isAdmin = false, cartCount = 0 }: { loggedIn: boolean; isAdmin?: boolean; cartCount?: number }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Home", icon: "home" as const, on: path === "/" },
    { href: "/categories", label: "Categories", icon: "grid" as const, on: path.startsWith("/categories") },
    // Admins get a shortcut to the admin panel; customers get product search.
    isAdmin
      ? { href: "/admin", label: "Admin", icon: "gear" as const, on: path.startsWith("/admin") }
      : { href: "/products?search=1", label: "Search", icon: "search" as const, on: path.startsWith("/products") },
    { href: loggedIn ? "/cart" : "/login?next=/cart", label: "Cart", icon: "cart" as const, on: path === "/cart", badge: cartCount },
    { href: loggedIn ? "/account" : "/login", label: loggedIn ? "Account" : "Login", icon: "user" as const, on: ["/account", "/login", "/notifications", "/forgot-password", "/reset-password"].some((x) => path.startsWith(x)) },
  ];
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
      <ul className="mx-auto grid h-[60px] max-w-md grid-cols-5">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} aria-current={i.on ? "page" : undefined}
              className={`relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition active:scale-90 ${i.on ? "text-brand-600" : "text-slate-400"}`}>
              {i.on && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand-gradient" />}
              <span className="relative">
                <Icon name={i.icon} className="h-6 w-6" />
                {!!i.badge && i.badge > 0 && <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{i.badge > 99 ? "99+" : i.badge}</span>}
              </span>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
