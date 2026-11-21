import Link from "next/link";

export default function CategoryTile({ c }: { c: any }) {
  const n = c.products?.[0]?.count ?? 0;
  return (
    <Link href={`/products?category=${c.slug}`} className="card card-hover flex items-center gap-3 !p-3 hover:border-brand-300">
      {c.image_url ? <img src={c.image_url} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl">🛍️</span>}
      <span className="min-w-0"><span className="block font-semibold leading-tight">{c.name}</span><span className="text-xs text-slate-500">{n} product{n === 1 ? "" : "s"}</span></span>
    </Link>
  );
}
