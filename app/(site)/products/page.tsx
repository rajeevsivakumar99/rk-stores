import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { CARD_COLS, ProductGrid } from "@/components/ProductCard";
import { Icon } from "@/components/Icons";
import SearchInput from "@/components/SearchInput";
import { Empty } from "@/components/ui";

const SORTS: Record<string, [string, boolean, string]> = {
  newest: ["created_at", false, "Newest first"], price_asc: ["price", true, "Price: low to high"], price_desc: ["price", false, "Price: high to low"],
  name_asc: ["name", true, "Name: A–Z"], name_desc: ["name", false, "Name: Z–A"],
};
const STATUSES: [string, string][] = [["", "Any stock"], ["available", "Available"], ["low_stock", "Low stock"], ["out_of_stock", "Out of stock"]];

export default async function Products({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sb = supabaseServer();
  const s = await getSettings();
  const { data: cats } = await sb.from("categories").select("name,slug").order("sort_order");
  const sortKey = searchParams.sort && SORTS[searchParams.sort] ? searchParams.sort : "newest";
  const [col, asc] = SORTS[sortKey];
  const term = (searchParams.q ?? "").replace(/[%,()]/g, " ").trim();
  const cur = { q: term || undefined, category: searchParams.category, status: searchParams.status, sort: searchParams.sort };

  let q = sb.from("products_view").select(CARD_COLS);
  if (term) q = q.ilike("name", `%${term}%`);
  if (cur.category) q = q.eq("category_slug", cur.category);
  if (cur.status) q = q.eq("stock_status", cur.status);
  const { data: products } = await q.order(col, { ascending: asc }).limit(120);

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...cur, ...over })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };
  const chipRow = "no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0";

  return (
    <>
      <h1 className="mb-2 hidden text-xl font-bold md:mb-3 md:block md:text-2xl">Products</h1>
      <form action="/products" className="sticky top-14 z-20 -mx-4 flex gap-2 bg-slate-50/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:px-0">
        {cur.category && <input type="hidden" name="category" value={cur.category} />}
        {cur.status && <input type="hidden" name="status" value={cur.status} />}
        {cur.sort && <input type="hidden" name="sort" value={cur.sort} />}
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <SearchInput defaultValue={term} />
        </div>
        <button className="btn !rounded-full !px-4" aria-label="Search"><Icon name="search" className="h-5 w-5 md:hidden" /><span className="hidden md:inline">Search</span></button>
      </form>

      <div className={`${chipRow} mt-1`} role="group" aria-label="Categories">
        <Link href={href({ category: undefined })} className={`chip ${!cur.category ? "chip-active" : ""}`}>All</Link>
        {cats?.map((c: any) => <Link key={c.slug} href={href({ category: c.slug })} className={`chip ${cur.category === c.slug ? "chip-active" : ""}`}>{c.name}</Link>)}
      </div>
      <div className={`${chipRow} mt-2`} role="group" aria-label="Availability">
        {STATUSES.map(([v, l]) => <Link key={v} href={href({ status: v || undefined })} className={`chip ${(cur.status ?? "") === v ? "chip-active" : ""}`}>{l}</Link>)}
      </div>

      <div className="mb-3 mt-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{products?.length ?? 0} product{products?.length === 1 ? "" : "s"}</p>
        <details className="relative">
          <summary className="btn-outline cursor-pointer list-none">Sort: {SORTS[sortKey][2]} ▾</summary>
          <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border bg-white shadow-lg">
            {Object.entries(SORTS).map(([k, [, , label]]) => (
              <Link key={k} href={href({ sort: k })} className={`flex min-h-[44px] items-center px-4 text-sm hover:bg-slate-50 ${k === sortKey ? "font-bold text-brand-700" : ""}`}>{label}</Link>
            ))}
          </div>
        </details>
      </div>
      {products?.length ? <ProductGrid items={products} s={s} /> : <Empty text="No products match your search." />}
    </>
  );
}
