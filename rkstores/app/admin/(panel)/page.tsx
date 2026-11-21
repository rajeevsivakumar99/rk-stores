import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui";
import { money, fmtDateTime } from "@/lib/util";
import { getSalesStatus } from "@/lib/sales-reminders";
import { fmtLeft } from "@/lib/sales-logic";

export default async function Dashboard() {
  const sb = supabaseServer();
  const count = (table: string, f?: (q: any) => any) => {
    const q = sb.from(table).select("*", { count: "exact", head: true });
    return (f ? f(q) : q).then((r: any) => r.count ?? 0);
  };

  const [
    totalProducts, cats, avail, low, out, customers, activeOffers,
    totalOrders, recent, notes, lowList, { data: s },
    pendingOrders,
  ] = await Promise.all([
    count("products"), count("categories"),
    count("products_view", (q) => q.eq("stock_status", "available")),
    count("products_view", (q) => q.eq("stock_status", "low_stock")),
    count("products_view", (q) => q.eq("stock_status", "out_of_stock")),
    count("profiles", (q) => q.eq("role", "customer")),
    count("offers_view", (q) => q.eq("is_active", true)),
    count("orders"),
    sb.from("orders").select("id,status,total,created_at,profiles(full_name,email)").order("created_at", { ascending: false }).limit(6),
    sb.from("notifications").select("id,title,type,sent_at,created_at").order("created_at", { ascending: false }).limit(5),
    sb.from("products_view").select("id,name,quantity,stock_status").in("stock_status", ["low_stock", "out_of_stock"]).order("quantity").limit(10),
    sb.from("store_settings").select("low_stock_threshold").eq("id", 1).single(),
    count("orders", (q) => q.eq("status", "pending")),
  ]);

  // Today's sales + feedback (these quietly show nothing if migration 003 has not been run yet).
  const salesStatus = await getSalesStatus(sb).catch(() => null);
  const { data: todaySale } = salesStatus
    ? await sb.from("daily_sales").select("gpay_amount,cash_amount,total_amount").eq("sale_date", salesStatus.date).maybeSingle()
    : { data: null };
  const { count: newFeedback } = await sb.from("feedback").select("*", { count: "exact", head: true }).eq("status", "new");

  const stats: [string, number | string, string?][] = [
    ["Total products", totalProducts],
    ["Total orders", totalOrders],
    ["Categories", cats],
    ["Available", avail, "text-green-700"],
    ["Low stock", low, "text-amber-600"],
    ["Out of stock", out, "text-red-600"],
    ["Customers", customers],
    ["Active offers", activeOffers],
    ["Pending orders", pendingOrders, "text-amber-600"],
    ["New feedback", newFeedback ?? 0, "text-brand-700"],
  ];

  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Dashboard</h1>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
        <Link href="/admin/products?new=1" className="btn">➕ Add product</Link>
        <Link href="/admin/orders" className="btn-outline">📦 Manage orders</Link>
        <Link href="/admin/notifications" className="btn-outline">📣 Send announcement</Link>
        <Link href="/admin/coupons" className="btn-outline">🎟️ Coupons</Link>
        <Link href="/admin/sales" className="btn-outline">💰 Daily sales</Link>
        <Link href="/admin/sales/analytics" className="btn-outline">📊 Sales analytics</Link>
      </div>
      {salesStatus && (
        <Link href="/admin/sales" className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4 transition hover:shadow-soft ${todaySale ? "border-green-200 bg-green-50" : salesStatus.shopDay ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
          {todaySale ? (
            <>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-green-700">Today&apos;s sales</p><p className="text-2xl font-extrabold text-green-900">{money(todaySale.total_amount)}</p></div>
              <p className="text-sm text-green-800">GPay {money(todaySale.gpay_amount)} · Cash {money(todaySale.cash_amount)}</p>
            </>
          ) : (
            <>
              <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Today&apos;s sales</p><p className="font-bold text-amber-900">{salesStatus.shopDay ? "Not entered yet" : "Weekly off / holiday"}</p></div>
              {salesStatus.shopDay && <p className="text-sm font-semibold text-amber-800">{salesStatus.minsLeft > 0 ? `${fmtLeft(salesStatus.minsLeft)} left - ` : ""}enter GPay + Cash →</p>}
            </>
          )}
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {stats.map(([l, v, c]) => (
          <div key={l} className="card !p-3"><p className="text-xs text-slate-500">{l}</p><p className={`text-2xl font-extrabold ${c ?? ""}`}>{typeof v === "number" ? v : v}</p></div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-2 font-semibold">Recent orders</h2>
          {recent.data?.length ? (
            <ul className="divide-y text-sm">
              {recent.data.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <Link href={`/admin/orders/${o.id}`} className="touch-link min-w-0 truncate hover:underline">#{o.id.slice(0, 8)}</Link>
                    <p className="text-xs text-slate-500">{o.profiles?.full_name ?? o.profiles?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{money(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">No orders yet.</p>}
        </div>
        <div className="card lg:col-span-1">
          <h2 className="mb-2 font-semibold">⚠️ Stock alerts <span className="text-xs font-normal text-slate-500">(low stock ≤ {s?.low_stock_threshold})</span></h2>
          {lowList.data?.length ? (
            <ul className="divide-y text-sm">
              {lowList.data.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                  <Link href={`/admin/products/${p.id}`} className="touch-link min-w-0 truncate hover:underline">{p.name}</Link>
                  <span className="flex items-center gap-2">{p.quantity} <StatusBadge status={p.stock_status} /></span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">All products are well stocked.</p>}
        </div>
        <div className="card lg:col-span-2">
          <h2 className="mb-2 font-semibold">Recent notifications</h2>
          {notes.data?.length ? (
            <ul className="divide-y text-sm">
              {notes.data.map((n: any) => (
                <li key={n.id} className="flex items-start justify-between gap-2 py-2">
                  <span className="min-w-0">{n.title} <span className="text-xs text-slate-400">({n.type})</span></span>
                  <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(n.sent_at ?? n.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">Nothing sent yet.</p>}
        </div>
      </div>
    </>
  );
}
