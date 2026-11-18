import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { StatusBadge } from "@/components/ui";
import { addToCart } from "@/app/actions/cart";
import { money, waLink } from "@/lib/util";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const [s, { data: p }] = await Promise.all([getSettings(), supabaseServer().from("products_view").select("*").eq("id", params.id).maybeSingle()]);
  if (!p) notFound();
  const out = p.stock_status === "out_of_stock";
  const wa = waLink(s?.whatsapp_number, s?.store_name, p.name);
  return (
    <div className="animate-fade-up">
      <p className="mb-3 text-sm text-slate-500"><Link href="/products" className="touch-link hover:text-brand-700">Products</Link> <span className="mx-1">/</span> <Link href={`/products?category=${p.category_slug}`} className="touch-link hover:text-brand-700">{p.category_name}</Link></p>
      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
        <div className="-mx-4 aspect-square overflow-hidden bg-slate-100 shadow-soft md:mx-0 md:rounded-3xl">
          {p.image_url ? <img src={p.image_url} alt={p.name} className={`h-full w-full object-cover ${out ? "opacity-60 grayscale" : ""}`} />
            : <div className="flex h-full items-center justify-center text-7xl text-slate-300">🛍️</div>}
        </div>
        <div>
          <StatusBadge status={p.stock_status} />
          <h1 className="mt-2 text-2xl font-extrabold leading-tight md:text-3xl">{p.name}</h1>
          <p className="mt-2 text-4xl font-extrabold text-brand-700">{money(p.price)}</p>
          {s?.show_quantity && !out && <p className="mt-1 text-sm text-slate-500">{p.quantity} in stock</p>}
          {p.description && <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-700">{p.description}</p>}
          <p className="mt-4 text-xs text-slate-400">Product ID: {p.product_code}</p>

          {!out && (
            <form action={addToCart} className="mt-5 flex max-w-sm gap-2">
              <input type="hidden" name="product_id" value={p.id} />
              <input type="number" name="quantity" defaultValue={1} min={1} max={p.quantity} aria-label="Quantity" className="input w-24 text-center" />
              <button className="btn flex-1">🛒 Add to cart</button>
            </form>
          )}

          {/* Phones: enquiry button stays pinned above the tab bar. Larger screens: inline. */}
          <div className="h-16 lg:hidden" />
          <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 border-t bg-white/90 p-3 backdrop-blur lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0">
            {out ? <button className="btn w-full lg:w-auto" disabled>Out of Stock</button>
              : wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-wa w-full lg:w-auto">💬 Enquire on WhatsApp</a>
              : <button className="btn w-full lg:w-auto" disabled>Enquiry unavailable</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
