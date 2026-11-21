import { cache } from "react";
import { supabaseServer } from "./supabase/server";

export const getUser = cache(async () => (await supabaseServer().auth.getUser()).data.user);
export const getSettings = cache(
  async () => (await supabaseServer().from("store_settings").select("*").eq("id", 1).single()).data as any
);
export const getTimings = cache(
  async () => ((await supabaseServer().from("shop_timings").select("*").order("weekday")).data ?? []) as any[]
);
export const getProfile = cache(async () => {
  const u = await getUser();
  if (!u) return null;
  return (await supabaseServer().from("profiles").select("*").eq("id", u.id).single()).data as any;
});

export const getCartCount = cache(async () => {
  const u = await getUser();
  if (!u) return 0;
  // Row Level Security limits this to the signed-in customer's own cart.
  const { data } = await supabaseServer().from("cart_items").select("quantity");
  return (data ?? []).reduce((n: number, r: any) => n + Number(r.quantity ?? 0), 0);
});

export const getUnread = cache(async () => {
  const u = await getUser();
  if (!u) return 0;
  const { count } = await supabaseServer().from("notification_deliveries").select("id", { count: "exact", head: true })
    .eq("user_id", u.id).eq("channel", "in_app").is("read_at", null);
  return count ?? 0;
});
