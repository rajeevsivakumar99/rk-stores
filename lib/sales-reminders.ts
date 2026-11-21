import { supabaseAdmin } from "./supabase/admin";
import { dispatch, ADMIN_ROLES } from "./notify";
import { nowIn, toMin } from "./scheduler";
import { fmtTime } from "./util";
import { nextReminder, reminderText } from "./sales-logic";
import { log, errMsg } from "./logger";

type Db = { from: (t: string) => any };

export type SalesStatus = {
  date: string;            // today in the shop's time zone, YYYY-MM-DD
  shopDay: boolean;        // false on weekly offs / holidays / closures (no sales entry is expected)
  minsLeft: number;        // minutes until the day ends (closing time, or midnight if no closing time is set)
  closesAt: string | null; // "18:00:00" or null
  entered: boolean;        // has today's GPay + Cash entry been saved?
  store: string;
};

/**
 * Works out whether today's sales entry is still missing and how long is left. "The day ends" at the shop's closing
 * time for today (per-day timings, weekly off, holidays and special hours are all respected); with no closing time it is midnight.
 * Works with the service-role client (scheduler) and with an admin's own client (admin pages).
 */
export async function getSalesStatus(db: Db): Promise<SalesStatus | null> {
  const { data: s } = await db.from("store_settings").select("store_name,timezone").eq("id", 1).maybeSingle();
  if (!s) return null;
  const now = nowIn(s.timezone);

  let shopDay = true;
  let closes: string | null = null;
  const { data: t } = await db.from("shop_timings").select("*").eq("weekday", now.weekday).maybeSingle();
  if (t?.is_weekly_holiday) shopDay = false;
  else closes = t?.closes_at ?? null;

  const { data: hols } = await db.from("holidays").select("*").lte("start_date", now.date);
  const today = (hols ?? []).filter((h: any) => (h.end_date ?? h.start_date) >= now.date);
  if (today.some((h: any) => h.kind !== "special_hours")) shopDay = false;
  const special = today.find((h: any) => h.kind === "special_hours" && h.special_closes_at);
  if (special) closes = special.special_closes_at;

  const { data: sale, error } = await db.from("daily_sales").select("id").eq("sale_date", now.date).maybeSingle();
  if (error) return null; // table missing (migration 003 not run yet) or no permission: stay quiet
  return {
    date: now.date, shopDay, closesAt: closes, store: s.store_name ?? "RK Stores",
    minsLeft: (closes ? toMin(closes) : 24 * 60) - now.minutes,
    entered: !!sale,
  };
}

/**
 * Called by the scheduler every few minutes (see /api/cron/closing).
 * If today's GPay + Cash entry is still missing it reminds the admins 2 hours, 1 hour and 30 minutes (urgent) before the day ends.
 * Each reminder is sent once per day; once the entry is saved the reminders stop.
 */
export async function runSalesReminders() {
  const db = supabaseAdmin();
  const st = await getSalesStatus(db);
  if (!st) return { skipped: "no settings or daily_sales table (run migration 003)" };
  if (!st.shopDay) return { skipped: "weekly off / holiday today" };
  if (st.entered) return { skipped: "today's sales already entered" };

  const { data: rows } = await db.from("notifications").select("id,dedupe_key,sent_at").like("dedupe_key", `sales:${st.date}:%`);
  const sent = new Set<number>();
  const unsent = new Map<number, string>();
  for (const r of (rows ?? []) as any[]) {
    const stage = Number(String(r.dedupe_key).split(":")[2]);
    if (r.sent_at) sent.add(stage); else unsent.set(stage, r.id);
  }

  const stage = nextReminder(st.minsLeft, sent);
  if (stage === null) return { skipped: "no reminder due", minsLeft: st.minsLeft };

  let id = unsent.get(stage);
  if (!id) {
    const text = reminderText(stage, st.store, st.closesAt ? fmtTime(st.closesAt) : null);
    const { data, error } = await db.from("notifications")
      .insert({ title: text.title, message: text.message, type: "sales_reminder", channels: ["in_app", "push", "email"], dedupe_key: `sales:${st.date}:${stage}` })
      .select("id").single();
    if (error) {
      // Another run created it a moment ago (or migration 003 is missing): do nothing.
      log.warn("sales.reminder.not_created", { stage, error: error.message });
      return { skipped: "reminder already created or could not be created", error: error.message };
    }
    id = data.id as string;
  }
  try {
    const result = await dispatch(id, { roles: ADMIN_ROLES, url: "/admin/sales" });
    log.info("sales.reminder.sent", { date: st.date, stage, minsLeft: st.minsLeft, ...result });
    return { sent: `${stage} minutes before the day ends`, minsLeft: st.minsLeft, ...result };
  } catch (e) {
    log.error("sales.reminder.failed", { stage, error: errMsg(e) });
    throw e;
  }
}
