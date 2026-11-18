import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Makes the site installable ("Add to Home Screen") and app-like. The name follows the store name in Settings.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "RK Stores";
  try {
    const { data } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      .from("store_settings").select("store_name").eq("id", 1).single();
    if (data?.store_name) name = data.store_name;
  } catch { /* fall back to default */ }
  return {
    name, short_name: name.slice(0, 12), description: "Browse products, check stock and enquire on WhatsApp.",
    start_url: "/", scope: "/", display: "standalone", orientation: "portrait",
    background_color: "#f6f7fb", theme_color: "#4f46e5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
