import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { saveCoupon, deleteCoupon } from "@/app/admin/actions";
import ConfirmButton from "@/components/ConfirmButton";
import { money } from "@/lib/util";

export default async function AdminCoupons({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sb = supabaseServer();
  const { data: coupons } = await sb.from("coupons").select("*").order("created_at", { ascending: false }).limit(200);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold md:text-2xl">Coupons &amp; discounts</h1>
        <Link href="/admin/coupons?new=1" className="btn">➕ Add coupon</Link>
      </div>

      {searchParams.new && (
        <details className="card mb-4" open>
          <summary className="touch-link w-full cursor-pointer font-semibold">➕ New coupon</summary>
          <div className="mt-3">
            <form action={saveCoupon} className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <input name="code" placeholder="CODE (e.g. DIWALI20)" className="input" required />
              <select name="discount_type" className="input">
                <option value="percent">Percent off</option>
                <option value="amount">Amount off</option>
              </select>
              <input name="discount_value" type="number" min="0" placeholder="Value" className="input" required />
              <input name="min_order" type="number" min="0" placeholder="Min order (₹)" className="input" />
              <input name="max_uses" type="number" min="0" placeholder="Max uses" className="input" />
              <input name="ends_at" type="datetime-local" className="input" />
              <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="active" defaultChecked /> Active</label>
              <button className="btn col-span-2 sm:col-span-auto">Save coupon</button>
            </form>
          </div>
        </details>
      )}

      <ul className="space-y-2 md:hidden">
        {coupons?.map((c: any) => (
          <li key={c.id} className="card !p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-semibold">{c.code}</p>
                <p className="text-xs text-slate-500">
                  {c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`} · {c.active ? "Active" : "Inactive"}
                  {c.max_uses !== null && c.max_uses !== undefined && ` · ${c.used_count}/${c.max_uses} used`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={deleteCoupon.bind(null, c.id)}><ConfirmButton message={`Delete coupon "${c.code}"?`} className="btn-danger text-xs">Delete</ConfirmButton></form>
              </div>
            </div>
          </li>
        ))}
        {!coupons?.length && <li className="card text-center text-sm text-slate-500">No coupons yet.</li>}
      </ul>

      <div className="card hidden overflow-x-auto !p-0 md:block">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Code</th>
              <th className="th">Type</th>
              <th className="th text-right">Value</th>
              <th className="th">Min order</th>
              <th className="th text-center">Uses</th>
              <th className="th">Active</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {coupons?.map((c: any) => (
              <tr key={c.id} className="td">
                <td className="td">{c.code}</td>
                <td className="td">{c.discount_type}</td>
                <td className="td text-right">{c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                <td className="td">{c.min_order ?? "—"}</td>
                <td className="td text-center">{c.used_count}{c.max_uses !== null && c.max_uses !== undefined ? `/${c.max_uses}` : ""}</td>
                <td className="td">{c.active ? "✅" : "❌"}</td>
                <td className="td">
                  <form action={deleteCoupon.bind(null, c.id)}><ConfirmButton message={`Delete coupon "${c.code}"?`} className="btn-danger text-xs">Delete</ConfirmButton></form>
                </td>
              </tr>
            ))}
            {!coupons?.length && <tr><td className="td text-center text-slate-500" colSpan={7}>No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
