import Link from "next/link";
import { money, waLink } from "@/lib/util";
import { addToCart } from "@/app/actions/cart";
import { StatusBadge } from "./ui";

export const CARD_COLS = "id,name,description,image_url,price,quantity,stock_status,category_name";

export default function ProductCard({ p, s }: { p: any; s: any }) {
  const out = p.stock_status === "out_of_stock";
  const wa = waLink(s?.whatsapp_number, s?.store_name, p.name);
  return (
    <div className="card card-hover group flex h-full flex-col overflow-hidden !p-0">
      <Link href={`/products/${p.id}`} className="relative block aspect-square overflow-hidden bg-slate-100">
        {p.image_url
          ? <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${out ? "opacity-50 grayscale" : ""}`} />
          : <div className="flex h-full items-center justify-center text-4xl text-slate-300">🛍️</div>}
        <span className="absolute left-2 top-2"><StatusBadge status={p.stock_status} /></span>
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-brand-600 sm:text-xs">{p.category_name}</p>
        <Link href={`/products/${p.id}`} className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-slate-900 hover:text-brand-700">{p.name}</Link>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-lg font-extrabold text-slate-900">{money(p.price)}</span>
          {s?.show_quantity && !out && <span className="text-[11px] text-slate-500 sm:text-xs">{p.quantity} left</span>}
        </div>
        <div className="mt-auto flex gap-2 pt-3">
          {out ? <button className="btn w-full" disabled>Out of Stock</button> : (
            <>
              <form action={addToCart} className="min-w-0 flex-1">
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="quantity" value="1" />
                <button className="btn w-full !px-3" aria-label={`Add ${p.name} to cart`}>🛒 Add<span className="hidden sm:inline">&nbsp;to cart</span></button>
              </form>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Enquire about ${p.name} on WhatsApp`} className="btn-wa !px-3.5">💬</a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const ProductGrid = ({ items, s }: { items: any[]; s: any }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} s={s} />)}</div>
);
