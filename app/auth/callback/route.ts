import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-redirect";

/**
 * Landing point for links sent by Supabase: email confirmation, password reset and Google sign-in.
 * - Email confirmation: Supabase verifies the token itself, then sends the customer here with ?code=...
 *   We exchange the code for a session and show the "email verified" page.
 * - Expired / invalid links come back with an error (in the query string, or in the #fragment which only the browser can read),
 *   so they are passed on to /verify-email, which explains what happened and offers a new email.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const go = (path: string) => NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? url.origin));
  const next = safeInternalPath(url.searchParams.get("next")); // null unless a safe same-site path
  const code = url.searchParams.get("code");
  const problem = url.searchParams.get("error_code") ?? url.searchParams.get("error");

  if (problem && !next) return go(`/verify-email?status=error&code=${encodeURIComponent(problem.slice(0, 60))}`);

  if (code) {
    const { data, error } = await supabaseServer().auth.exchangeCodeForSession(code);
    // Opened on another device than the one that registered: Supabase has already verified the address,
    // there is just no sign-in session to create here. Ask the customer to log in.
    if (error) return go(next ?? "/verify-email?status=login");
    if (next) return go(next);
    return go(data.user?.app_metadata?.provider === "email" ? "/verify-email?status=success" : "/");
  }

  // No code and no query-string error: an expired link puts its error in the #fragment, which the browser keeps across this redirect.
  return go(next ?? "/verify-email");
}
