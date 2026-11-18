import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { CARD_COLS, ProductGrid } from "@/components/ProductCard";
import ProductCard from "@/components/ProductCard";
import CategoryTile from "@/components/CategoryTile";
import OfferCard from "@/components/OfferCard";
import { HItem, HScroll } from "@/components/HScroll";
import { Icon } from "@/components/Icons";
import { Section, Empty } from "@/components/ui";
import { fmtDate, ymd } from "@/lib/util";

export default async function Home() {
  const sb = supabaseServer();
  const s = await getSettings();
  const tz = s?.timezone ?? "Asia/Kolkata";
  const today = ymd(new Date(), tz);
  const byStatus = (st: string) => sb.from("products_view").select(CARD_COLS).eq("stock_status", st).order("updated_at", { ascending: false }).limit(8);
  const [cats, latest, avail, low, out, offers, hols, news] = await Promise.all([
    sb.from("categories").select("id,name,slug,image_url, products(count)").order("sort_order"),
    sb.from("products_view").select(CARD_COLS).order("created_at", { ascending: false }).limit(8),
    byStatus("available"), byStatus("low_stock"), byStatus("out_of_stock"),
    sb.from("offers_view").select("*").eq("is_active", true).order("ends_at").limit(6),
    sb.from("holidays").select("*").or(`start_date.gte.${today},end_date.gte.${today}`).order("start_date").limit(4),
    sb.from("notifications").select("id,title,message,created_at").eq("type", "custom").order("created_at", { ascending: false }).limit(3),
  ]);

  const row = (title: string, res: any, empty: string, href: string) => (
    <Section title={title} href={href}>
      {res.data?.length ? <HScroll>{res.data.map((p: any) => <HItem key={p.id}><ProductCard p={p} s={s} /></HItem>)}</HScroll> : <Empty text={empty} />}
    </Section>
  );
  const announcements = [
    ...(hols.data ?? []).map((h: any) => ({ key: `h${h.id}`, title: h.title, text: h.description, meta: `${fmtDate(h.start_date)}${h.end_date ? ` – ${fmtDate(h.end_date)}` : ""}` })),
    ...(news.data ?? []).map((n: any) => ({ key: `n${n.id}`, title: n.title, text: n.message, meta: fmtDate(n.created_at) })),
  ];

  return (
    <>
      <form action="/products" className="md:hidden">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input type="search" name="q" enterKeyHint="search" placeholder="Search products…" aria-label="Search products" className="input !rounded-full pl-10 shadow-soft" />
        </div>
      </form>

      <div className="relative mt-3 animate-fade-up overflow-hidden rounded-3xl bg-hero-gradient p-5 text-white shadow-lift md:mt-0 md:p-12">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-accent-400/20 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-white/70">Welcome to</p>
        <h1 className="relative mt-1 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{s?.store_name}</h1>
        <p className="relative mt-2 max-w-xl text-sm text-white/85 md:mt-3 md:text-base">{s?.description || "Browse our collection, check prices and stock, and order on WhatsApp."}</p>
        <div className="relative mt-4 flex flex-wrap gap-2 md:mt-6">
          <Link href="/products" className="inline-flex min-h-[44px] items-center rounded-xl bg-white px-5 text-sm font-bold text-brand-700 shadow-soft transition hover:-translate-y-0.5 active:scale-95">Shop now</Link>
          <Link href="/offers" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95">🏷️ See offers</Link>
        </div>
      </div>

      <Section title="Shop by category" id="categories" href="/categories">
        {cats.data?.length ? (
          <>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:hidden">
              {cats.data.map((c: any) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className="w-[76px] shrink-0 text-center active:opacity-70">
                  {c.image_url ? <img src={c.image_url} alt="" loading="lazy" decoding="async" className="mx-auto h-16 w-16 rounded-full border object-cover" /> : <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-2xl">🛍️</span>}
                  <span className="mt-1 line-clamp-2 block text-xs font-medium leading-tight">{c.name}</span>
                  <span className="text-[11px] text-slate-500">{c.products?.[0]?.count ?? 0}</span>
                </Link>
              ))}
            </div>
            <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-4">{cats.data.map((c: any) => <CategoryTile key={c.id} c={c} />)}</div>
          </>
        ) : <Empty text="No categories yet." />}
      </Section>

      {announcements.length > 0 && (
        <Section title="Shop announcements">
          <div className="grid gap-2.5 md:grid-cols-2 md:gap-3">
            {announcements.map((a) => (
              <div key={a.key} className="card border-l-4 border-l-brand-500 !p-3">
                <p className="text-xs text-slate-500">{a.meta}</p>
                <p className="font-semibold">{a.title}</p>
                {a.text && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-600">{a.text}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Special offers" id="offers" href="/offers">
        {offers.data?.length ? <HScroll cols="md:grid-cols-2 lg:grid-cols-3">{offers.data.map((o: any) => <HItem key={o.id} wide><OfferCard o={o} tz={tz} /></HItem>)}</HScroll>
          : <Empty text="No active offers right now. Check back soon!" />}
      </Section>

      {row("Latest products", latest, "No products yet.", "/products?sort=newest")}
      {row("Available products", avail, "No products currently marked available.", "/products?status=available")}
      {row("Low-stock products", low, "No low-stock products.", "/products?status=low_stock")}
      {row("Out-of-stock products", out, "Nothing is out of stock.", "/products?status=out_of_stock")}
    </>
  );
}
