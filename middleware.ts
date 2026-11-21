import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser(); // also refreshes the session cookie
  const p = req.nextUrl.pathname;
  const go = (path: string, next?: string) => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    url.search = next ? `?next=${encodeURIComponent(next)}` : "";
    return NextResponse.redirect(url);
  };

  // One login page for everyone: the old separate admin login now points to it.
  if (p === "/admin/login") return go("/login", "/admin");

  const isAdminArea = p === "/admin" || p.startsWith("/admin/");
  const needsLogin = isAdminArea || p.startsWith("/account") || p.startsWith("/notifications") || p.startsWith("/cart") || p.startsWith("/feedback");
  if (needsLogin && !user) return go("/login", p);
  // An unconfirmed email account must verify first (phone-password accounts are created already confirmed).
  if (needsLogin && user && !user.email_confirmed_at && !user.phone_confirmed_at) return go("/login");

  // Admin pages: only accounts whose role is admin / super_admin get in. Customers are sent to the shop.
  if (isAdminArea && user) {
    const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (prof?.role !== "admin" && prof?.role !== "super_admin") return go("/");
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"] };
