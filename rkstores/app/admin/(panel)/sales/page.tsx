import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { nowIn } from "@/lib/scheduler";
import { getSalesStatus } from "@/lib/sales-reminders";
import { addDays, fmtLeft, isYmd, weekdayOf } from "@/lib/sales-logic";
import { deleteDailySale } from "@/app/admin/sales-actions";
import SalesForm from "@/components/SalesForm";
import ConfirmButton from "@/components/ConfirmButton";
import { money } from "@/lib/util";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pretty = (d: string) => `${DAY[weekdayOf(d)]}, ${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export default async function SalesPage({ searchParams }: { searchParams: { date?: string } }) {
  const sb = supabaseServer();
  const { data: s } = await sb.from("store_settings").select("timezone").eq("id", 1).maybeSingle();
  const today = nowIn(s?.timezone ?? "Asia/Kolkata").date;
  const date = isYmd(searchParams.date) && searchParams.date <= today ? searchParams.date : today;
  const from = addDays(today, -29);

  const [hist, sel, tim, status] = await Promise.all([
    sb.from("daily_sales").select("sale_date,gpay_amount,cash_amount,total_amount,note").gte("sale_date", from).lte("sale_date", today).order("sale_date", { ascending: false }),
    sb.from("daily_sales").select("gpay_amount,cash_amount,note").eq("sale_date", date).maybeSingle(),
    sb.from("shop_timings").select("weekday,is_weekly_holiday"),
    getSalesStatus(sb),
  ]);

  if (hist.error) {
    return (
      <div className="card max-w-xl">
        <h1 className="text-xl font-bold">Daily sales</h1>
        <p className="mt-2 text-sm text-red-700">The sales table is not set up yet. In Supabase → SQL Editor, run <code className="rounded bg-slate-100 px-1">supabase/migrations/003_daily_sales_feedback.sql</code>, then reload this page.</p>
      </div>
    );
  }

  const byDate = new Map((hist.data ?? []).map((r: any) => [r.sale_date, r]));
  const off = new Set((tim.data ?? []).filter((t: any) => t.is_weekly_holiday).map((t: any) => t.weekday));
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, -i));
  const todayRow: any = byDate.get(today);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-extrabold">Daily sales</h1>
        <Link href="/admin/sales/analytics" className="btn-outline">📊 View analytics</Link>
      </div>

      {todayRow ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">✅ Today&apos;s sales are saved</p>
          <p className="mt-1 text-2xl font-extrabold text-green-900">{money(todayRow.total_amount)}</p>
          <p className="text-sm text-green-800">GPay {money(todayRow.gpay_amount)} · Cash {money(todayRow.cash_amount)}</p>
        </div>
      ) : status && status.shopDay ? (
        <div className={`rounded-2xl border p-4 ${status.minsLeft <= 30 ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
          <p className="font-semibold">{status.minsLeft <= 30 ? "🚨 " : "⏰ "}Today&apos;s sales are not entered yet</p>
          <p className="text-sm">{status.minsLeft > 0 ? `${fmtLeft(status.minsLeft)} left before the day ends.` : "The day has ended - please enter them now."} You will get reminders 2 hours, 1 hour and 30 minutes before closing.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Today is a weekly off / holiday, so no sales entry is expected. You can still enter one.</div>
      )}

      <div className="card">
        <h2 className="mb-3 text-lg font-bold">{sel.data ? `Edit entry · ${pretty(date)}` : `Enter sales · ${pretty(date)}`}</h2>
        <SalesForm key={`${date}-${sel.data ? "e" : "n"}`} date={date} maxDate={today} existing={!!sel.data}
          gpay={sel.data ? String(sel.data.gpay_amount) : ""} cash={sel.data ? String(sel.data.cash_amount) : ""} note={sel.data?.note ?? ""} />
        {sel.data && (
          <form action={deleteDailySale} className="mt-3">
            <input type="hidden" name="sale_date" value={date} />
            <ConfirmButton message={`Delete the sales entry for ${date}?`} className="touch-link text-sm text-red-600 underline">Delete this entry</ConfirmButton>
          </form>
        )}
      </div>

      <div className="card !p-0 overflow-hidden">
        <h2 className="px-4 pt-4 text-lg font-bold">Last 30 days</h2>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[520px]">
            <thead className="bg-slate-50"><tr><th className="th">Date</th><th className="th text-right">GPay</th><th className="th text-right">Cash</th><th className="th text-right">Total</th><th className="th" /></tr></thead>
            <tbody className="divide-y">
              {days.map((d) => {
                const r: any = byDate.get(d);
                const weeklyOff = off.has(weekdayOf(d));
                return (
                  <tr key={d} className={d === date ? "bg-brand-50/60" : ""}>
                    <td className="td whitespace-nowrap">{pretty(d)}{r?.note && <span className="block text-xs text-slate-400">{r.note}</span>}</td>
                    {r ? (
                      <>
                        <td className="td text-right">{money(r.gpay_amount)}</td>
                        <td className="td text-right">{money(r.cash_amount)}</td>
                        <td className="td text-right font-bold">{money(r.total_amount)}</td>
                      </>
                    ) : (
                      <td className="td text-center text-xs" colSpan={3}>
                        {weeklyOff ? <span className="text-slate-400">Weekly off</span> : <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">Missing</span>}
                      </td>
                    )}
                    <td className="td text-right"><Link href={`/admin/sales?date=${d}`} className="touch-link font-medium text-brand-700 hover:underline">{r ? "Edit" : "Add"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
