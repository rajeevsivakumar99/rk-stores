import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteProduct } from "@/app/admin/actions";
import ProductForm from "@/components/ProductForm";
import ConfirmButton from "@/components/ConfirmButton";
import { StatusBadge } from "@/components/ui";
import { money } from "@/lib/util";

export default async function AdminProducts({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sb = supabaseServer();
  const { data: cats } = await sb.from("categories").select("id,name,slug").order("sort_order");
  const term = (searchParams.q ?? "").replace(/[%,()]/g, " ").trim();
  let q = sb.from("products_view").select("*");
  if (term) q = q.or(`name.ilike.%${term}%,product_code.ilike.%${term}%`);
  if (searchParams.category) q = q.eq("category_slug", searchParams.category);
  if (searchParams.status) q = q.eq("stock_status", searchParams.status);
  const { data: products } = await q.order("updated_at", { ascending: false }).limit(300);
  const thumb = (p: any, cls: string) => p.image_url ? <img src={p.image_url} alt="" loading="lazy" decoding="async" className={`${cls} rounded-lg object-cover`} /> : <div className={`${cls} rounded-lg bg-slate-100`} />;
  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Products</h1>
      <details className="card mb-3" open={!!searchParams.new}>
        <summary className="touch-link w-full cursor-pointer font-semibold">➕ Add new product</summary>
        <div className="mt-3"><ProductForm cats={cats ?? []} /></div>
      </details>
      <form className="card mb-3 grid grid-cols-2 gap-2 !p-3 sm:grid-cols-4">
        <input name="q" type="search" defaultValue={term} placeholder="Search name or ID" aria-label="Search products" className="input col-span-2 sm:col-span-1" />
        <select name="category" defaultValue={searchParams.category ?? ""} className="input" aria-label="Category"><option value="">All categories</option>{cats?.map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <select name="status" defaultValue={searchParams.status ?? ""} className="input" aria-label="Status"><option value="">Any status</option><option value="available">Available</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option></select>
        <button className="btn col-span-2 sm:col-span-1">Filter</button>
      </form>

      {/* Phones: card list */}
      <ul className="space-y-2 md:hidden">
        {products?.map((p: any) => (
          <li key={p.id} className="card !p-3">
            <div className="flex gap-3">
              <Link href={`/admin/products/${p.id}`} className="shrink-0">{thumb(p, "h-16 w-16")}</Link>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/products/${p.id}`} className="-my-3 line-clamp-2 block py-3 font-semibold leading-snug">{p.name}</Link>
                <p className="truncate text-xs text-slate-400">{p.product_code} · {p.category_name}</p>
                <p className="mt-1 text-sm"><b>{money(p.price)}</b> · Qty {p.quantity}</p>
              </div>
              <div className="shrink-0"><StatusBadge status={p.stock_status} /></div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href={`/admin/products/${p.id}`} className="btn-outline">Edit</Link>
              <form action={deleteProduct.bind(null, p.id)}><ConfirmButton message={`Delete "${p.name}"?`} className="btn-danger w-full">Delete</ConfirmButton></form>
            </div>
          </li>
        ))}
        {!products?.length && <li className="card text-center text-sm text-slate-500">No products found.</li>}
      </ul>

      {/* Tablet/desktop: table */}
      <div className="card hidden overflow-x-auto !p-0 md:block">
        <table className="w-full">
          <thead className="border-b bg-slate-50"><tr><th className="th">Product</th><th className="th">Category</th><th className="th">Price</th><th className="th">Qty</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody className="divide-y">
            {products?.map((p: any) => (
              <tr key={p.id}>
                <td className="td"><div className="flex items-center gap-2">{thumb(p, "h-10 w-10")}<div><p className="font-medium">{p.name}</p><p className="text-xs text-slate-400">{p.product_code}</p></div></div></td>
                <td className="td">{p.category_name}</td><td className="td">{money(p.price)}</td><td className="td">{p.quantity}</td>
                <td className="td"><StatusBadge status={p.stock_status} /></td>
                <td className="td"><div className="flex gap-2"><Link href={`/admin/products/${p.id}`} className="btn-outline !px-3 !text-xs">Edit</Link>
                  <form action={deleteProduct.bind(null, p.id)}><ConfirmButton message={`Delete "${p.name}"?`}>Delete</ConfirmButton></form></div></td>
              </tr>
            ))}
            {!products?.length && <tr><td className="td text-center text-slate-500" colSpan={6}>No products found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
