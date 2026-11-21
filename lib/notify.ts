import webpush from "web-push";
import { supabaseAdmin } from "./supabase/admin";
import { sendEmail } from "./email";
import { esc } from "./util";

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

function emailHtml(store: string, n: any) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:16px">
<h2 style="color:#c2410c">${esc(n.title)}</h2>
${n.image_url ? `<img src="${esc(n.image_url)}" alt="" style="max-width:100%;border-radius:8px">` : ""}
<p style="font-size:15px;line-height:1.5">${esc(n.message).replace(/\n/g, "<br>")}</p>
<hr style="border:none;border-top:1px solid #eee"><p style="color:#888;font-size:12px">${esc(store)}${site ? ` · <a href="${esc(site)}">${esc(site)}</a>` : ""}</p></div>`;
}

/**
 * Deliver a notification on its channels. By default it goes to all customers; pass `roles` to target other accounts
 * (the sales reminders and feedback alerts use ["admin","super_admin"]) and `url` for where a push notification opens.
 * Idempotent: users who already have a delivery row are skipped.
 */
export const ADMIN_ROLES = ["admin", "super_admin"];
export async function dispatch(notificationId: string, opts: { roles?: string[]; url?: string } = {}) {
  const db = supabaseAdmin();
  const { data: n } = await db.from("notifications").select("*").eq("id", notificationId).single();
  if (!n) throw new Error("Notification not found");
  const { data: settings } = await db.from("store_settings").select("store_name").eq("id", 1).single();
  const store = settings?.store_name ?? "RK Stores";
  const channels: string[] = n.channels ?? [];

  const { data: users } = await db.from("profiles").select("id,email,notification_preferences(in_app,email,push)").in("role", opts.roles ?? ["customer"]);
  const pref = (u: any) => (Array.isArray(u.notification_preferences) ? u.notification_preferences[0] : u.notification_preferences) ?? {};
  const { data: existing } = await db.from("notification_deliveries").select("user_id,channel").eq("notification_id", n.id);
  const seen = new Set((existing ?? []).map((r: any) => `${r.user_id}:${r.channel}`));
  const now = new Date().toISOString();
  const rows: any[] = [];
  const add = (user_id: string, channel: string, status: string, error?: string) =>
    rows.push({ notification_id: n.id, user_id, channel, status, error: error ?? null, sent_at: now });

  const list = (users ?? []) as any[];

  if (channels.includes("in_app")) {
    for (const u of list) if (pref(u).in_app !== false && !seen.has(`${u.id}:in_app`)) add(u.id, "in_app", "delivered");
  }

  if (channels.includes("email")) {
    const targets = list.filter((u) => u.email && pref(u).email !== false && !seen.has(`${u.id}:email`));
    const html = emailHtml(store, n);
    for (const group of chunk(targets, 5)) {
      const results = await Promise.all(group.map((u) => sendEmail(u.email, n.title, html)));
      group.forEach((u, i) => add(u.id, "email", results[i].ok ? "sent" : "failed", results[i].error));
    }
  }

  if (channels.includes("push") && process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const targets = list.filter((u) => pref(u).push !== false && !seen.has(`${u.id}:push`));
    const { data: subs } = await db.from("push_subscriptions").select("*").in("user_id", targets.map((u) => u.id));
    const byUser = new Map<string, any[]>();
    (subs ?? []).forEach((s: any) => byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]));
    const payload = JSON.stringify({ title: n.title, body: n.message.slice(0, 180), url: opts.url ?? "/notifications" });
    const dead: string[] = [];
    for (const [userId, userSubs] of byUser) {
      let ok = false; let err = "";
      for (const s of userSubs) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); ok = true; }
        catch (e: any) { err = e?.message ?? "push failed"; if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.id); }
      }
      add(userId, "push", ok ? "sent" : "failed", ok ? undefined : err);
    }
    if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);
  }

  for (const part of chunk(rows, 500)) {
    await db.from("notification_deliveries").upsert(part, { onConflict: "notification_id,user_id,channel", ignoreDuplicates: true });
  }
  await db.from("notifications").update({ sent_at: now }).eq("id", n.id);
  const count = (c: string) => rows.filter((r) => r.channel === c).length;
  return { in_app: count("in_app"), email: count("email"), push: count("push"), failed: rows.filter((r) => r.status === "failed").length };
}

export async function createAndDispatch(
  db: ReturnType<typeof supabaseAdmin>,
  fields: { title: string; message: string; image_url?: string | null; type: string; channels: string[]; offer_id?: string | null; holiday_id?: string | null; created_by?: string | null; dedupe_key?: string }
) {
  const { data, error } = await db.from("notifications").insert(fields).select("id").single();
  if (error) throw new Error(error.message);
  return dispatch(data.id);
}

/** Creates a notification and delivers it to admin accounts only (never to customers). */
export async function notifyAdmins(
  db: ReturnType<typeof supabaseAdmin>,
  fields: { title: string; message: string; type: string; channels: string[]; url?: string; dedupe_key?: string }
) {
  const { url, ...row } = fields;
  const { data, error } = await db.from("notifications").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return dispatch(data.id, { roles: ADMIN_ROLES, url });
}
