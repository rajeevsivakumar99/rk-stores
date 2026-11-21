import Link from "next/link";
import { notFound } from "next/navigation";
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

export default async function AdminOrder({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: order } = await sb
    .from("orders")
    .select("*, order_items(*), profiles(full_name, email, phone)")
    .eq("id", params.id)
    .single();
  if (!order) notFound();

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/orders" className="touch-link text-brand-700 hover:underline">← Orders</Link></p>
      <h1 className="mb-1 text-xl font-bold md:text-2xl">Order #{order.id.slice(0, 8)}</h1>
      <p className="mb-4 text-sm text-slate-500">
        {order.profiles?.full_name ?? order.profiles?.email} · {order.profiles?.phone ?? ""} · {fmtDateTime(order.created_at)}
      </p>

      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        <div className="card">
          <h2 className="mb-2 text-lg font-bold">Order items</h2>
          <ul className="divide-y divide-slate-200 text-sm">
            {(order.order_items ?? []).map((i: any) => (
              <li key={i.id} className="py-3 flex justify-between">
                <div>
                  <p className="font-medium">{i.product_name}</p>
                  <p className="text-xs text-slate-500">{i.product_code ?? ""} · {i.quantity} × {money(i.unit_price)}</p>
                </div>
                <span className="font-medium">{money(i.total_price)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-2 text-lg font-bold">Order summary</h2>
          <table className="w-full text-sm divide-y divide-slate-200">
            <tr className="td"><td className="td">Subtotal</td><td className="td text-right">{money(order.subtotal)}</td></tr>
            <tr className="td"><td className="td">Discount</td><td className="td text-right">-{money(order.discount)}</td></tr>
            <tr className="td font-bold"><td className="td">Total</td><td className="td text-right">{money(order.total)}</td></tr>
          </table>
        </div>
        <div className="card">
          <h2 className="mb-2 text-lg font-bold">Update status</h2>
          <form action={updateOrderStatus} className="space-y-2">
            <input type="hidden" name="order_id" value={order.id} />
            <select name="status" defaultValue={order.status} className="input">
              {ORDER_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn w-full sm:w-auto">Update status</button>
          </form>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-bold">Customer</h2>
        <p className="text-sm">{order.profiles?.full_name ?? "—"}</p>
        <p className="text-sm">{order.profiles?.email ?? "—"}</p>
        {order.profiles?.phone && <p className="text-sm">{order.profiles.phone}</p>}
      </div>
    </>
  );
}
