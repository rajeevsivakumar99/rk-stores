import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { nowIn } from "@/lib/scheduler";
import { PRESETS, groupWeekly, pctChange, previousRange, rangeFor, summarize, weekdayOf } from "@/lib/sales-logic";
import { CASH_COLOR, GPAY_COLOR, SplitDonut, StackedBars, WeekdayBars } from "@/components/SalesCharts";
import { money } from "@/lib/util";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pretty = (d: string) => `${DAY[weekdayOf(d)]} ${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function SalesAnalytics({ searchParams }: { searchParams: { range?: string; from?: string; to?: string } }) {
  const sb = supabaseServer();
  const { data: s } = await sb.from("store_settings").select("timezone").eq("id", 1).maybeSingle();
  const today = nowIn(s?.timezone ?? "Asia/Kolkata").date;
  const range = rangeFor(searchParams.range, today, searchParams.from, searchParams.to);
  const prev = previousRange(range);
  const custom = !!(searchParams.from && searchParams.to && range.label.includes(" to "));

  const { data: rows, error } = await sb.from("daily_sales").select("sale_date,gpay_amount,cash_amount").gte("sale_date", prev.from).lte("sale_date", range.to);
  if (error) {
    return <div className="card max-w-xl"><h1 className="text-xl font-bold">Sales analytics</h1><p className="mt-2 text-sm text-red-700">The sales table is not set up yet. Run <code className="rounded bg-slate-100 px-1">supabase/migrations/003_daily_sales_feedback.sql</code> in Supabase, then reload.</p></div>;
  }
  const cur = summarize((rows ?? []).filter((r: any) => r.sale_date >= range.from), range, today);
  const before = summarize((rows ?? []).filter((r: any) => r.sale_date <= prev.to), prev, today);
  const change = pctChange(cur.total, before.total);
  const weekly = cur.days.length > 62;
  const chartDays = weekly ? groupWeekly(cur.days) : cur.days;
  const active = custom ? "custom" : PRESETS.find(([, l]) => l === range.label)?.[0] ?? "30d";

  const kpi = (label: string, value: string, sub?: string, tone = "") => (
    <div className="card !p-3.5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Sales analytics</h1>
          <p className="text-sm text-slate-500">{range.label} · {pretty(range.from)} → {pretty(range.to)}</p>
        </div>
        <Link href="/admin/sales" className="btn">➕ Enter sales</Link>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {PRESETS.map(([k, label]) => <Link key={k} href={`/admin/sales/analytics?range=${k}`} className={`chip ${active === k ? "chip-active" : ""}`}>{label}</Link>)}
      </div>
      <form className="card flex flex-wrap items-end gap-3 !p-3.5" action="/admin/sales/analytics">
        <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={range.from} max={today} className="input" /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={range.to} max={today} className="input" /></div>
        <button className="btn-outline">Apply custom range</button>
      </form>

      {cur.enteredDays === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-2 font-semibold">No sales entered in this period</p>
          <p className="mt-1 text-sm text-slate-500">Enter each day&apos;s GPay and Cash amounts and the analytics will appear here.</p>
          <p className="mt-4"><Link href="/admin/sales" className="btn">Enter today&apos;s sales</Link></p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpi("Total sales", money(cur.total), change === null ? "no earlier data to compare" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs previous ${cur.calendarDays} days`, "text-brand-700")}
            {kpi("GPay", money(cur.gpay), `${cur.gpayPct}% of sales`)}
            {kpi("Cash", money(cur.cash), `${cur.cashPct}% of sales`)}
            {kpi("Average / day", money(cur.avgPerDay), `over ${cur.enteredDays} entered day${cur.enteredDays === 1 ? "" : "s"}`)}
            {cur.best && kpi("Best day", money(cur.best.total), pretty(cur.best.date), "text-green-700")}
            {cur.lowest && kpi("Lowest day", money(cur.lowest.total), pretty(cur.lowest.date))}
            {kpi("Days entered", `${cur.enteredDays} / ${cur.calendarDays}`, cur.missingDays ? `${cur.missingDays} day${cur.missingDays === 1 ? "" : "s"} missing` : "all days entered", cur.missingDays ? "text-red-600" : "text-green-700")}
            {kpi("Previous period", money(before.total), `${prev.from} → ${prev.to}`)}
          </div>

          <div className="card">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{weekly ? "Weekly sales" : "Daily sales"}</h2>
              <p className="flex items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded" style={{ background: GPAY_COLOR }} />GPay</span>
                <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded" style={{ background: CASH_COLOR }} />Cash</span>
                <span className="flex items-center gap-1"><i className="inline-block h-1 w-3 rounded bg-slate-300" />Not entered</span>
              </p>
            </div>
            <StackedBars days={chartDays} weekly={weekly} />
            <p className="mt-1 text-xs text-slate-400">Hover (or long-press) a bar for the exact amounts.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 text-lg font-bold">GPay vs Cash</h2>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <SplitDonut gpay={cur.gpay} cash={cur.cash} />
                <ul className="w-full space-y-3 text-sm">
                  <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded" style={{ background: GPAY_COLOR }} />GPay</span><span className="font-semibold">{money(cur.gpay)} <span className="font-normal text-slate-500">({cur.gpayPct}%)</span></span></li>
                  <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded" style={{ background: CASH_COLOR }} />Cash</span><span className="font-semibold">{money(cur.cash)} <span className="font-normal text-slate-500">({cur.cashPct}%)</span></span></li>
                </ul>
              </div>
            </div>
            <div className="card">
              <h2 className="mb-3 text-lg font-bold">Average by weekday</h2>
              <WeekdayBars avg={cur.weekdayAvg} />
            </div>
          </div>

          {cur.months.length > 1 && (
            <div className="card !p-0 overflow-hidden">
              <h2 className="px-4 pt-4 text-lg font-bold">Monthly summary</h2>
              <div className="overflow-x-auto">
                <table className="mt-2 w-full min-w-[460px]">
                  <thead className="bg-slate-50"><tr><th className="th">Month</th><th className="th text-right">Days</th><th className="th text-right">GPay</th><th className="th text-right">Cash</th><th className="th text-right">Total</th></tr></thead>
                  <tbody className="divide-y">
                    {cur.months.map((m) => <tr key={m.month}><td className="td">{monthName(m.month)}</td><td className="td text-right">{m.days}</td><td className="td text-right">{money(m.gpay)}</td><td className="td text-right">{money(m.cash)}</td><td className="td text-right font-bold">{money(m.total)}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
