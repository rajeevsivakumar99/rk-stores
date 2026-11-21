import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import { isAdminRole } from "./util";
import { log } from "./logger";

/** For admin server actions: sends anyone who is not a logged-in admin to the login page. Returns the user's own client (RLS still applies). */
export async function requireAdminUser() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isAdminRole(p?.role)) { log.warn("admin.denied", { user: user.id }); redirect("/login"); }
  return { sb, user };
}
