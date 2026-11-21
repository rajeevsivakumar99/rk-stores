import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { updateOrderStatus } from "@/app/admin/actions";
import ConfirmButton from "@/components/ConfirmButton";
import { StatusBadge } from "@/components/ui";
import { money, fmtDateTime } from "@/lib/util";

const ORDER_STATUSES: [string, string][] = [
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["preparing", "Preparing"],
  ["ready", "Ready"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

export default async function AdminOrders({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sb = supabaseServer();
  const term = (searchParams.q ?? "").replace(/[%,()]/g, " ").trim();
  let q = sb
    .from("orders")
    .select("*, order_items(count), profiles(full_name, email, phone)")
    .order("created_at", { ascending: false });
  if (term) q = q.or(`id.ilike.%${term}%,profiles.full_name.ilike.%${term}%,profiles.email.ilike.%${term}%`);
  if (searchParams.status) q = q.eq("status", searchParams.status);
  const { data: orders } = await q.limit(200);

  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Orders</h1>
      <form className="card mb-4 grid grid-cols-2 gap-2 !p-3 sm:grid-cols-3">
        <input
          name="q"
          type="search"
          defaultValue={term}
          placeholder="Search order, name or email"
          aria-label="Search orders"
          className="input col-span-2 sm:col-span-1"
        />
        <select name="status" defaultValue={searchParams.status ?? ""} className="input" aria-label="Status">
          <option value="">Any status</option>
          {ORDER_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn col-span-2 sm:col-span-1">Filter</button>
      </form>

      <ul className="space-y-2 md:hidden">
        {orders?.map((o: any) => (
          <li key={o.id} className="card !p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <Link href={`/admin/orders/${o.id}`} className="touch-link font-semibold hover:underline">
                  Order #{o.id.slice(0, 8)}
                </Link>
                <p className="text-xs text-slate-500">{o.profiles?.full_name ?? o.profiles?.email} · {fmtDateTime(o.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{money(o.total)}</span>
                <form action={updateOrderStatus} className="inline">
                  <input type="hidden" name="order_id" value={o.id} />
                  <select
                    name="status"
                    defaultValue={o.status}
                    className="input input-sm border px-2 py-1 text-xs"
                  >
                    {ORDER_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button className="btn-outline text-xs">Update</button>
                </form>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {o.order_items?.[0]?.count ?? 0} item(s)
            </p>
          </li>
        ))}
        {!orders?.length && <li className="card text-center text-sm text-slate-500">No orders found.</li>}
      </ul>

      <div className="card hidden overflow-x-auto !p-0 md:block">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Order</th>
              <th className="th">Customer</th>
              <th className="th text-right">Total</th>
              <th className="th">Status</th>
              <th className="th text-right">Date</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders?.map((o: any) => (
              <tr key={o.id} className="td">
                <td className="td"><Link href={`/admin/orders/${o.id}`} className="touch-link font-medium hover:underline">#{o.id.slice(0, 8)}</Link></td>
                <td className="td">{o.profiles?.full_name ?? o.profiles?.email}</td>
                <td className="td text-right">{money(o.total)}</td>
                <td className="td"><StatusBadge status={o.status} /></td>
                <td className="td text-right text-xs text-slate-500">{fmtDateTime(o.created_at)}</td>
                <td className="td">
                  <form action={updateOrderStatus} className="flex items-center gap-2">
                    <input type="hidden" name="order_id" value={o.id} />
                    <select name="status" defaultValue={o.status} className="input input-sm border px-2 py-1 text-xs">
                      {ORDER_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button className="btn-outline text-xs">Update</button>
                  </form>
                </td>
              </tr>
            ))}
            {!orders?.length && <tr><td className="td text-center text-slate-500" colSpan={6}>No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
