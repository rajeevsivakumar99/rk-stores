"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { done, fail } from "@/lib/flash";

async function me() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  return { sb, user };
}

export async function signOut() {
  await supabaseServer().auth.signOut();
  redirect("/");
}

const Profile = z.object({ full_name: z.string().trim().min(1, "Name is required").max(100), phone: z.string().trim().max(20) });
export async function updateProfile(fd: FormData) {
  const { sb, user } = await me();
  const p = Profile.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail("/account", p.error.issues[0].message);
  const { error } = await sb.from("profiles").update({ ...p.data, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return fail("/account", error.message);
  done("/account", "Profile updated");
}

export async function markRead(id: string) {
  const { sb, user } = await me();
  await sb.from("notification_deliveries").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/notifications");
}
export async function markAllRead() {
  const { sb, user } = await me();
  await sb.from("notification_deliveries").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/notifications");
}

export async function setEmailPref(value: boolean) {
  const { sb, user } = await me();
  await sb.from("notification_preferences").upsert({ user_id: user.id, email: value }, { onConflict: "user_id" });
}

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const { sb, user } = await me();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) throw new Error("Invalid subscription");
  await sb.from("push_subscriptions").upsert({ user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: "endpoint" });
  await sb.from("notification_preferences").upsert({ user_id: user.id, push: true }, { onConflict: "user_id" });
}
export async function removePushSubscription(endpoint: string) {
  const { sb, user } = await me();
  const q = sb.from("push_subscriptions").delete().eq("user_id", user.id);
  await (endpoint ? q.eq("endpoint", endpoint) : q);
  await sb.from("notification_preferences").upsert({ user_id: user.id, push: false }, { onConflict: "user_id" });
}
