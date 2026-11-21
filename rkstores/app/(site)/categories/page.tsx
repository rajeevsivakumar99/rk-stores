import { supabaseServer } from "@/lib/supabase/server";
import CategoryTile from "@/components/CategoryTile";
import { Empty } from "@/components/ui";

export default async function Categories() {
  const { data } = await supabaseServer().from("categories").select("id,name,slug,image_url, products(count)").order("sort_order");
  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Categories</h1>
      {data?.length ? <div className="grid gap-2.5 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">{data.map((c: any) => <CategoryTile key={c.id} c={c} />)}</div> : <Empty text="No categories yet." />}
    </>
  );
}
