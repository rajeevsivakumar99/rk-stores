import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import OfferCard from "@/components/OfferCard";
import { Empty } from "@/components/ui";

export default async function Offers() {
  const [s, { data }] = await Promise.all([getSettings(), supabaseServer().from("offers_view").select("*").eq("is_active", true).order("ends_at")]);
  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Special offers</h1>
      {data?.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.map((o: any) => <OfferCard key={o.id} o={o} tz={s?.timezone} />)}</div> : <Empty text="No active offers right now. Check back soon!" />}
    </>
  );
}
