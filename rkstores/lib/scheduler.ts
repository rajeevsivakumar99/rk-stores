import { supabaseAdmin } from "./supabase/admin";
import { dispatch } from "./notify";
import { fmtTime } from "./util";

export const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export function nowIn(tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" })
      .formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
  };
}

/** Called every few minutes by an external scheduler. Sends at most one closing reminder per day. */
export async function runClosingReminder() {
  const db = supabaseAdmin();
  const { data: s } = await db.from("store_settings").select("*").eq("id", 1).single();
  if (!s) return { skipped: "no settings" };
  if (!s.closing_notifications_enabled) return { skipped: "disabled" };

  const now = nowIn(s.timezone);
  const { data: t } = await db.from("shop_timings").select("*").eq("weekday", now.weekday).single();
  if (!t || t.is_weekly_holiday || !t.closes_at) return { skipped: "weekly holiday / no closing time" };

  let closes: string = t.closes_at;
  const { data: hols } = await db.from("holidays").select("*").lte("start_date", now.date);
  const today = (hols ?? []).filter((h: any) => (h.end_date ?? h.start_date) >= now.date);
  if (today.some((h: any) => h.kind !== "special_hours")) return { skipped: "holiday or closure today" };
  const special = today.find((h: any) => h.kind === "special_hours" && h.special_closes_at);
  if (special) closes = special.special_closes_at;

  const closeMin = toMin(closes);
  const notifyAt = closeMin - s.advance_notice_minutes;
  if (now.minutes < notifyAt || now.minutes >= closeMin) return { skipped: "outside notification window" };

  const key = `closing:${now.date}`;
  const { data: found } = await db.from("notifications").select("id,sent_at").eq("dedupe_key", key).maybeSingle();
  let id = found?.id as string | undefined;
  if (found?.sent_at) return { skipped: "already sent today" };
  if (!id) {
    const { data: created, error } = await db.from("notifications").insert({
      title: "Closing soon",
      message: `Dear Customer, ${s.store_name} will close at ${fmtTime(closes)} today. Please visit us before closing.`,
      type: "closing_reminder", channels: ["in_app", "email", "push"], dedupe_key: key,
    }).select("id").single();
    if (error) return { skipped: "another run created it", detail: error.message };
    id = created.id;
  }
  return { sent: await dispatch(id!) };
}
