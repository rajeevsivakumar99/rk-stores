import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProductForm from "@/components/ProductForm";
import { StatusBadge } from "@/components/ui";
import { fmtDateTime, money } from "@/lib/util";

export default async function EditProduct({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const [{ data: p }, { data: cats }, ph, sh] = await Promise.all([
    sb.from("products_view").select("*").eq("id", params.id).maybeSingle(),
    sb.from("categories").select("id,name").order("sort_order"),
    sb.from("price_history").select("*, profiles(full_name,email)").eq("product_id", params.id).order("changed_at", { ascending: false }).limit(20),
    sb.from("stock_history").select("*, profiles(full_name,email)").eq("product_id", params.id).order("changed_at", { ascending: false }).limit(20),
  ]);
  if (!p) notFound();
  const who = (r: any) => { const x = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles; return x?.full_name || x?.email || "—"; };
  const list = (rows: any[] | null, fmt: (v: any) => string, a: string, b: string, empty: string) => (
    rows?.length ? <ul className="divide-y text-sm">{rows.map((r) => (
      <li key={r.id} className="py-2"><p className="font-medium">{fmt(r[a])} → {fmt(r[b])}</p><p className="text-xs text-slate-500">{fmtDateTime(r.changed_at)} · {who(r)}</p></li>
    ))}</ul> : <p className="text-sm text-slate-500">{empty}</p>
  );
  return (
    <>
      <p className="mb-1 text-sm"><Link href="/admin/products" className="touch-link text-brand-700 hover:underline">← Products</Link></p>
      <h1 className="mb-1 text-xl font-bold md:text-2xl">Edit: {p.name}</h1>
      <p className="mb-3 text-sm text-slate-500">ID {p.product_code} · <StatusBadge status={p.stock_status} /> · Created {fmtDateTime(p.created_at)} · Updated {fmtDateTime(p.updated_at)}</p>
      <div className="card"><ProductForm p={p} cats={cats ?? []} /></div>
      <div className="mt-4 grid gap-3 md:mt-6 md:gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-1 font-semibold">Price history</h2>{list(ph.data, (v) => money(v), "old_price", "new_price", "No price changes yet.")}</div>
        <div className="card"><h2 className="mb-1 font-semibold">Stock history</h2>{list(sh.data, (v) => String(v), "old_quantity", "new_quantity", "No stock changes yet.")}</div>
      </div>
    </>
  );
}
