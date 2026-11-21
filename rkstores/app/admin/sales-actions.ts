"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/admin-guard";
import { done, fail } from "@/lib/flash";
import { nowIn } from "@/lib/scheduler";
import { isYmd } from "@/lib/sales-logic";
import { money } from "@/lib/util";
import { log } from "@/lib/logger";

// Both amounts are required (type 0 when there was none) so a missing entry can never be mistaken for a zero day.
const amount = (label: string) =>
  z.string().trim().min(1, `Enter the ${label} amount (type 0 if there was none).`)
    .regex(/^\d{1,9}(\.\d{1,2})?$/, `${label} must be a number such as 1500 or 1500.50.`);
const Schema = z.object({
  sale_date: z.string().refine(isYmd, "Pick a valid date."),
  gpay: amount("GPay"),
  cash: amount("Cash"),
  note: z.string().trim().max(300, "The note is too long (300 characters max).").optional(),
});

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const back = (date: string) => `/admin/sales${isYmd(date) ? `?date=${date}` : ""}`;

export async function saveDailySale(fd: FormData) {
  const { sb, user } = await requireAdminUser();
  const rawDate = str(fd.get("sale_date"));
  const p = Schema.safeParse({ sale_date: rawDate, gpay: str(fd.get("gpay")), cash: str(fd.get("cash")), note: str(fd.get("note")) || undefined });
  if (!p.success) return fail(back(rawDate), p.error.issues[0].message);

  const { data: s } = await sb.from("store_settings").select("timezone").eq("id", 1).maybeSingle();
  const today = nowIn(s?.timezone ?? "Asia/Kolkata").date;
  if (p.data.sale_date > today) return fail(back(today), "You cannot enter sales for a future date.");

  const gpay = Number(p.data.gpay), cash = Number(p.data.cash);
  const { error } = await sb.from("daily_sales").upsert(
    { sale_date: p.data.sale_date, gpay_amount: gpay, cash_amount: cash, note: p.data.note ?? null, entered_by: user.id, updated_at: new Date().toISOString() },
    { onConflict: "sale_date" }
  );
  if (error) {
    log.error("sales.save.failed", { date: p.data.sale_date, error: error.message });
    return fail(back(p.data.sale_date), /does not exist|schema cache/i.test(error.message) ? "The sales table is missing. Run supabase/migrations/003_daily_sales_feedback.sql in Supabase first." : error.message);
  }
  await sb.rpc("log_admin_activity", { p_action: "save_daily_sale", p_table_name: "daily_sales", p_record_id: p.data.sale_date, p_details: { gpay, cash } });
  log.info("sales.saved", { date: p.data.sale_date, gpay, cash, by: user.id });
  for (const path of ["/admin", "/admin/sales", "/admin/sales/analytics"]) revalidatePath(path);
  return done(back(p.data.sale_date), `Saved ${p.data.sale_date}: GPay ${money(gpay)} + Cash ${money(cash)} = ${money(gpay + cash)}.`);
}

export async function deleteDailySale(fd: FormData) {
  const { sb, user } = await requireAdminUser();
  const date = str(fd.get("sale_date"));
  if (!isYmd(date)) return fail("/admin/sales", "Invalid date.");
  const { error } = await sb.from("daily_sales").delete().eq("sale_date", date);
  if (error) { log.error("sales.delete.failed", { date, error: error.message }); return fail(back(date), error.message); }
  await sb.rpc("log_admin_activity", { p_action: "delete_daily_sale", p_table_name: "daily_sales", p_record_id: date, p_details: null });
  log.info("sales.deleted", { date, by: user.id });
  for (const path of ["/admin", "/admin/sales", "/admin/sales/analytics"]) revalidatePath(path);
  return done("/admin/sales", `Deleted the entry for ${date}.`);
}
