import Link from "next/link";
import { redirect } from "next/navigation";
import { getCart, updateCartItem, removeFromCart, clearCart } from "@/app/actions/cart";
import { getProfile, getSettings } from "@/lib/data";
import { money, waCartLink } from "@/lib/util";
import ConfirmButton from "@/components/ConfirmButton";

export default async function CartPage() {
  const [{ cart, items }, s, profile] = await Promise.all([getCart(), getSettings(), getProfile()]);
  if (!cart) redirect("/login?next=/cart");

  const available = items.filter((i: any) => i.product && i.product.stock_status !== "out_of_stock");
  const subtotal = available.reduce((sum: number, i: any) => sum + Number(i.product.price) * i.quantity, 0);
  const wa = waCartLink(
    s?.whatsapp_number, s?.store_name,
    available.map((i: any) => ({ name: i.product.name, qty: i.quantity, price: Number(i.product.price) })),
    subtotal, profile?.full_name
  );

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <div className="mb-4 flex items-end justify-between">
        <h1 className="text-2xl font-extrabold md:text-3xl">Your cart</h1>
        {items.length > 0 && <span className="text-sm text-slate-500">{items.length} item{items.length === 1 ? "" : "s"}</span>}
      </div>

      {items.length === 0 ? (
        <div className="card py-14 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-3xl">🛒</div>
          <p className="font-semibold">Your cart is empty</p>
          <p className="mt-1 text-sm text-slate-500">Add a few products and they will show up here.</p>
          <p className="mt-5"><Link href="/products" className="btn">Browse products</Link></p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((i: any) => {
              const p = i.product;
              if (!p) return null;
              const out = p.stock_status === "out_of_stock";
              return (
                <li key={i.id} className="card flex gap-3 !p-3 sm:gap-4 sm:!p-4">
                  <Link href={`/products/${p.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-24">
                    {p.image_url ? <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl text-slate-300">🛍️</span>}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/products/${p.id}`} className="line-clamp-2 font-semibold leading-snug hover:text-brand-700">{p.name}</Link>
                    <p className="text-xs text-slate-500">{p.product_code}</p>
                    {out && <p className="mt-1 text-xs font-semibold text-red-600">Out of stock — remove it to continue</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                      <span className="text-base font-extrabold text-brand-700">{money(Number(p.price) * i.quantity)}
                        {i.quantity > 1 && <span className="ml-1 text-xs font-normal text-slate-500">({money(p.price)} each)</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        {!out && (
                          <form action={updateCartItem} className="flex items-center gap-1">
                            <input type="hidden" name="item_id" value={i.id} />
                            <input type="number" name="quantity" defaultValue={i.quantity} min={1} max={p.quantity} aria-label="Quantity" className="input !min-h-[40px] w-16 text-center" />
                            <button className="btn-outline !min-h-[40px] !px-3 text-xs">Update</button>
                          </form>
                        )}
                        <form action={removeFromCart}>
                          <input type="hidden" name="item_id" value={i.id} />
                          <button className="touch-link rounded-lg px-2 text-sm font-medium text-red-600 hover:bg-red-50">Remove</button>
                        </form>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="card mt-4 !p-4 sm:!p-5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-2xl font-extrabold">{money(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Prices are what the shop shows today. The shop confirms availability on WhatsApp — no online payment.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {wa && available.length > 0
                ? <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-wa flex-1">💬 Send order on WhatsApp</a>
                : <button className="btn flex-1" disabled>{available.length === 0 ? "Nothing available to order" : "WhatsApp not set up yet"}</button>}
              <Link href="/products" className="btn-outline flex-1">Continue shopping</Link>
            </div>
          </div>

          <form action={clearCart} className="mt-4 text-center">
            <ConfirmButton message="Remove everything from your cart?" className="touch-link text-sm text-slate-500 underline hover:text-red-600">Clear cart</ConfirmButton>
          </form>
        </>
      )}
    </div>
  );
}
