import Link from "next/link";
import { fmtDate } from "@/lib/util";

export default function OfferCard({ o, tz }: { o: any; tz?: string }) {
  return (
    <Link href={`/offers/${o.id}`} className="card card-hover flex h-full flex-col overflow-hidden !p-0">
      {o.image_url && <img src={o.image_url} alt="" loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover" />}
      <div className="p-3">
        <span className="rounded-lg bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">
          {o.discount_percent ? `${Number(o.discount_percent)}% OFF` : o.discount_amount ? `₹${Number(o.discount_amount)} OFF` : "OFFER"}
        </span>
        <p className="mt-1.5 line-clamp-2 font-semibold leading-snug">{o.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">Ends {fmtDate(o.ends_at, tz)}</p>
      </div>
    </Link>
  );
}
