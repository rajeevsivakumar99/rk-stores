import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { fmtDate } from "@/lib/util";

export default async function OfferPage({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const [s, { data: o }] = await Promise.all([getSettings(), sb.from("offers_view").select("*").eq("id", params.id).maybeSingle()]);
  if (!o) notFound();
  const [prod, cat] = await Promise.all([
    o.product_id ? sb.from("products").select("id,name").eq("id", o.product_id).maybeSingle() : null,
    o.category_id ? sb.from("categories").select("name,slug").eq("id", o.category_id).maybeSingle() : null,
  ]);
  return (
    <div className="mx-auto max-w-2xl card overflow-hidden !p-0">
      {o.image_url && <img src={o.image_url} alt="" className="max-h-72 w-full object-cover" />}
      <div className="p-5">
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${o.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>{o.is_active ? "Active" : "Expired"}</span>
        <h1 className="mt-2 text-2xl font-bold">{o.title}</h1>
        <p className="mt-1 text-xl font-bold text-red-600">{o.discount_percent ? `${Number(o.discount_percent)}% OFF` : o.discount_amount ? `₹${Number(o.discount_amount)} OFF` : ""}</p>
        {o.description && <p className="mt-3 whitespace-pre-line">{o.description}</p>}
        <p className="mt-3 text-sm text-slate-500">Valid {fmtDate(o.starts_at, s?.timezone)} – {fmtDate(o.ends_at, s?.timezone)}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {prod?.data && <Link className="btn" href={`/products/${prod.data.id}`}>View {prod.data.name}</Link>}
          {cat?.data && <Link className="btn-outline" href={`/products?category=${cat.data.slug}`}>Browse {cat.data.name}</Link>}
        </div>
      </div>
    </div>
  );
}
