"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDailySale } from "@/app/admin/sales-actions";
import { money } from "@/lib/util";

const num = (v: string) => (/^\d+(\.\d{1,2})?$/.test(v.trim()) ? Number(v) : 0);

/** Daily sales entry: GPay + Cash. The total updates as you type. Changing the date loads that day's saved values. */
export default function SalesForm({ date, maxDate, gpay, cash, note, existing }: {
  date: string; maxDate: string; gpay: string; cash: string; note: string; existing: boolean;
}) {
  const router = useRouter();
  const [g, setG] = useState(gpay);
  const [c, setC] = useState(cash);
  const total = num(g) + num(c);
  const amountProps = { type: "text", inputMode: "decimal" as const, autoComplete: "off", pattern: "\\d+(\\.\\d{1,2})?", required: true };

  return (
    <form action={saveDailySale} className="space-y-4">
      <div>
        <label className="label" htmlFor="sale_date">Date</label>
        <input id="sale_date" name="sale_date" type="date" value={date} max={maxDate} required className="input max-w-xs"
          onChange={(e) => e.target.value && router.push(`/admin/sales?date=${e.target.value}`)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="gpay">GPay amount (₹)</label>
          <input id="gpay" name="gpay" {...amountProps} value={g} onChange={(e) => setG(e.target.value)} placeholder="e.g. 12500" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cash">Cash amount (₹)</label>
          <input id="cash" name="cash" {...amountProps} value={c} onChange={(e) => setC(e.target.value)} placeholder="e.g. 8300" className="input" />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
        <span className="text-sm font-medium text-brand-800">Total sales</span>
        <span className="text-2xl font-extrabold text-brand-700">{money(total)}</span>
      </div>
      <div>
        <label className="label" htmlFor="note">Note (optional)</label>
        <input id="note" name="note" defaultValue={note} maxLength={300} placeholder="e.g. festival rush, power cut…" className="input" />
      </div>
      <button className="btn w-full sm:w-auto">{existing ? "Update entry" : "Save today's sales"}</button>
    </form>
  );
}
