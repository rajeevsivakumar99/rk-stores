"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAndDispatch } from "@/lib/notify";
import { done, fail } from "@/lib/flash";
import { isAdminRole, slugify, zonedToUtc } from "@/lib/util";

/** Every admin action starts here. RLS also enforces admin-only writes in the database. */
async function requireAdmin() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (!isAdminRole(p?.role)) redirect("/login");
  return { sb, user };
}
const refresh = () => revalidatePath("/", "layout");
const blank = (o: Record<string, any>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === "" ? null : v]));
const url = z.string().url().or(z.literal("")).optional();
const CHANNELS = ["in_app", "email", "push"];
const channelsOf = (fd: FormData) => {
  const c = fd.getAll("channels").map(String).filter((x) => CHANNELS.includes(x));
  return c.length ? c : ["in_app"];
};

// ---------- Products ----------
const Product = z.object({
  name: z.string().trim().min(1, "Product name is required").max(150),
  category_id: z.string().uuid("Select a category"),
  description: z.string().max(2000).optional(),
  image_url: url,
  price: z.coerce.number({ invalid_type_error: "Enter a valid price" }).min(0, "Price cannot be negative"),
  quantity: z.coerce.number({ invalid_type_error: "Enter a valid quantity" }).int("Quantity must be a whole number").min(0, "Quantity cannot be negative"),
});
export async function saveProduct(fd: FormData) {
  const { sb } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const back = id ? `/admin/products/${id}` : "/admin/products";
  const p = Product.safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(back, p.error.issues[0].message);
  const v = blank(p.data);
  const { error } = id ? await sb.from("products").update(v).eq("id", id) : await sb.from("products").insert(v);
  if (error) return fail(back, error.message);
  refresh(); done("/admin/products", id ? "Product updated" : "Product added");
}
export async function deleteProduct(id: string) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) return fail("/admin/products", error.message);
  refresh(); done("/admin/products", "Product deleted");
}

// ---------- Categories ----------
const Category = z.object({ name: z.string().trim().min(1, "Category name is required").max(80), image_url: url, sort_order: z.coerce.number().int().default(0) });
export async function saveCategory(fd: FormData) {
  const { sb } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const c = Category.safeParse(Object.fromEntries(fd));
  if (!c.success) return fail("/admin/categories", c.error.issues[0].message);
  const v = { ...blank(c.data), slug: slugify(c.data.name) };
  const { error } = id ? await sb.from("categories").update(v).eq("id", id) : await sb.from("categories").insert(v);
  if (error) return fail("/admin/categories", error.message);
  refresh(); done("/admin/categories", "Category saved");
}
export async function deleteCategory(id: string) {
  const { sb } = await requireAdmin();
  const { count } = await sb.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) return fail("/admin/categories", `Cannot delete: ${count} product(s) use this category. Move or delete them first.`);
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) return fail("/admin/categories", error.message);
  refresh(); done("/admin/categories", "Category deleted");
}

// ---------- Offers ----------
const Offer = z.object({
  title: z.string().trim().min(1, "Offer title is required").max(150),
  description: z.string().max(2000).optional(),
  image_url: url,
  discount_percent: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined)),
  discount_amount: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date is required"),
  product_id: z.string().uuid().or(z.literal("")).optional(),
  category_id: z.string().uuid().or(z.literal("")).optional(),
});
export async function saveOffer(fd: FormData) {
  const { sb, user } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const o = Offer.safeParse(Object.fromEntries(fd));
  if (!o.success) return fail("/admin/offers", o.error.issues[0].message);
  if (!o.data.discount_percent && !o.data.discount_amount) return fail("/admin/offers", "Enter a discount percentage or amount");
  if (o.data.end_date < o.data.start_date) return fail("/admin/offers", "End date must be on or after the start date");
  const { data: s } = await sb.from("store_settings").select("timezone").eq("id", 1).single();
  const tz = s?.timezone ?? "Asia/Kolkata";
  const { start_date, end_date, ...rest } = o.data;
  const v = {
    ...blank(rest), discount_percent: rest.discount_percent ?? null, discount_amount: rest.discount_amount ?? null,
    starts_at: zonedToUtc(start_date, "00:00:00", tz).toISOString(), ends_at: zonedToUtc(end_date, "23:59:59", tz).toISOString(),
  };
  const res = id ? await sb.from("offers").update(v).eq("id", id).select("id").single() : await sb.from("offers").insert(v).select("id").single();
  if (res.error) return fail("/admin/offers", res.error.message);
  let note = "Offer saved";
  if (fd.get("notify") === "on") {
    try {
      const d = o.data.discount_percent ? `${o.data.discount_percent}% off` : `₹${o.data.discount_amount} off`;
      await createAndDispatch(supabaseAdmin(), {
        title: `🎉 ${o.data.title}`, message: `${o.data.description ? o.data.description + "\n" : ""}${d}. Valid until ${end_date}.`,
        image_url: o.data.image_url || null, type: "offer", channels: channelsOf(fd), offer_id: res.data.id, created_by: user.id,
      });
      note = "Offer saved and notification sent";
    } catch (e: any) { return fail("/admin/offers", `Offer saved, but notification failed: ${e.message}`); }
  }
  refresh(); done("/admin/offers", note);
}
export async function deleteOffer(id: string) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("offers").delete().eq("id", id);
  if (error) return fail("/admin/offers", error.message);
  refresh(); done("/admin/offers", "Offer deleted");
}

// ---------- Holidays / closures ----------
const Holiday = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().max(2000).optional(),
  kind: z.enum(["holiday", "unexpected_closure", "temporary_closure", "special_hours", "festival"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  special_opens_at: z.string().optional(), special_closes_at: z.string().optional(),
  image_url: url,
});
export async function saveHoliday(fd: FormData) {
  const { sb, user } = await requireAdmin();
  const h = Holiday.safeParse(Object.fromEntries(fd));
  if (!h.success) return fail("/admin/holidays", h.error.issues[0].message);
  if (h.data.end_date && h.data.end_date < h.data.start_date) return fail("/admin/holidays", "End date must be on or after the start date");
  if (h.data.kind === "special_hours" && !h.data.special_closes_at) return fail("/admin/holidays", "Enter the special closing time");
  const { data, error } = await sb.from("holidays").insert(blank(h.data)).select("id").single();
  if (error) return fail("/admin/holidays", error.message);
  let note = "Announcement saved";
  if (fd.get("notify") === "on") {
    try {
      const when = h.data.end_date && h.data.end_date !== h.data.start_date ? `${h.data.start_date} to ${h.data.end_date}` : h.data.start_date;
      await createAndDispatch(supabaseAdmin(), {
        title: h.data.title, message: `${h.data.description ? h.data.description + "\n" : ""}Date: ${when}`, image_url: h.data.image_url || null,
        type: "holiday", channels: channelsOf(fd), holiday_id: data.id, created_by: user.id,
      });
      note = "Announcement saved and notification sent";
    } catch (e: any) { return fail("/admin/holidays", `Saved, but notification failed: ${e.message}`); }
  }
  refresh(); done("/admin/holidays", note);
}
export async function deleteHoliday(id: string) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("holidays").delete().eq("id", id);
  if (error) return fail("/admin/holidays", error.message);
  refresh(); done("/admin/holidays", "Announcement deleted");
}

// ---------- Custom announcements ----------
const Announcement = z.object({ title: z.string().trim().min(1, "Title is required").max(150), message: z.string().trim().min(1, "Message is required").max(2000), image_url: url });
export async function sendAnnouncement(fd: FormData) {
  const { user } = await requireAdmin();
  const a = Announcement.safeParse(Object.fromEntries(fd));
  if (!a.success) return fail("/admin/notifications", a.error.issues[0].message);
  try {
    const r = await createAndDispatch(supabaseAdmin(), { ...a.data, image_url: a.data.image_url || null, type: "custom", channels: channelsOf(fd), created_by: user.id });
    refresh(); done("/admin/notifications", `Sent — in-app: ${r.in_app}, email: ${r.email}, push: ${r.push}${r.failed ? `, failed: ${r.failed}` : ""}`);
  } catch (e: any) {
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    return fail("/admin/notifications", e?.message ?? "Could not send");
  }
}

// ---------- Store settings & timings ----------
const Settings = z.object({
  store_name: z.string().trim().min(1, "Store name is required").max(100),
  logo_url: url, description: z.string().max(1000).optional(),
  whatsapp_number: z.string().regex(/^\+?[0-9 ()-]{8,20}$/, "Enter a valid WhatsApp number with country code, e.g. 919876543210").or(z.literal("")).optional(),
  contact_number: z.string().max(30).optional(), address: z.string().max(500).optional(),
  maps_link: url, email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  low_stock_threshold: z.coerce.number().int().min(0).max(1000),
  advance_notice_minutes: z.coerce.number().int().min(0).max(1440),
  timezone: z.string().min(1),
});
export async function saveSettings(fd: FormData) {
  const { sb } = await requireAdmin();
  const s = Settings.safeParse(Object.fromEntries(fd));
  if (!s.success) return fail("/admin/settings", s.error.issues[0].message);
  try { new Intl.DateTimeFormat("en", { timeZone: s.data.timezone }); } catch { return fail("/admin/settings", "Unknown time zone (use e.g. Asia/Kolkata)"); }
  const { error } = await sb.from("store_settings").update({
    ...blank(s.data), show_quantity: fd.get("show_quantity") === "on",
    closing_notifications_enabled: fd.get("closing_notifications_enabled") === "on", updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return fail("/admin/settings", error.message);
  refresh(); done("/admin/settings", "Store settings saved");
}
export async function saveTimings(fd: FormData) {
  const { sb } = await requireAdmin();
  const rows = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    weekday: d, opens_at: String(fd.get(`opens_${d}`) || "") || null, closes_at: String(fd.get(`closes_${d}`) || "") || null,
    is_weekly_holiday: fd.get(`holiday_${d}`) === "on",
  })) as any;
  for (const r of rows) if (!r.is_weekly_holiday && r.opens_at && r.closes_at && r.closes_at <= r.opens_at) return fail("/admin/settings", "Closing time must be after opening time");
  const { error } = await sb.from("shop_timings").upsert(rows, { onConflict: "weekday" });
  if (error) return fail("/admin/settings", error.message);
  refresh(); done("/admin/settings", "Shop timings saved");
}

// ---------- Orders ----------
const OrderStatus = z.object({
  order_id: z.string().uuid("Invalid order"),
  status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]),
});
export async function updateOrderStatus(fd: FormData) {
  const { sb, user } = await requireAdmin();
  const o = OrderStatus.safeParse(Object.fromEntries(fd));
  if (!o.success) return fail("/admin/orders", o.error.issues[0].message);
  const { order_id, status } = o.data;
  const { error } = await sb.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", order_id);
  if (error) return fail("/admin/orders", error.message);
  try {
    await sb.rpc("log_admin_activity", { p_action: `order_status:${status}`, p_table_name: "orders", p_record_id: order_id });
  } catch { /* non-fatal */ }
  refresh(); done("/admin/orders", `Order #${order_id.slice(0, 8)} set to ${status}.`);
}

// ---------- Coupons ----------
const Coupon = z.object({
  code: z.string().trim().min(1, "Coupon code is required").max(40),
  discount_type: z.enum(["percent", "amount"]),
  discount_value: z.coerce.number().min(0, "Discount value cannot be negative"),
  min_order: z.coerce.number().min(0).optional(),
  max_uses: z.coerce.number().int().min(0).optional(),
  ends_at: z.string().optional(),
  active: z.boolean().default(true),
});
export async function saveCoupon(fd: FormData) {
  const { sb, user } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const c = Coupon.safeParse(Object.fromEntries(fd));
  if (!c.success) return fail("/admin/coupons", c.error.issues[0].message);
  const v = { ...blank(c.data), code: c.data.code.toUpperCase(), ends_at: c.data.ends_at || null };
  const { error } = id
    ? await sb.from("coupons").update(v).eq("id", id)
    : await sb.from("coupons").insert(v);
  if (error) return fail("/admin/coupons", error.message);
  try { await sb.rpc("log_admin_activity", { p_action: "coupon_save", p_table_name: "coupons", p_record_id: id || null }); } catch { /* non-fatal */ }
  refresh(); done("/admin/coupons", id ? "Coupon updated" : "Coupon added");
}
export async function deleteCoupon(id: string) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("coupons").delete().eq("id", id);
  if (error) return fail("/admin/coupons", error.message);
  refresh(); done("/admin/coupons", "Coupon deleted");
}

// ---------- Banners ----------
const Banner = z.object({
  title: z.string().trim().min(1, "Banner title is required").max(100),
  subtitle: z.string().max(300).optional(),
  image_url: url,
  link_url: url,
  position: z.enum(["home", "category", "top"]),
  sort_order: z.coerce.number().int().default(0),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  active: z.boolean().default(true),
});
export async function saveBanner(fd: FormData) {
  const { sb, user } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const b = Banner.safeParse(Object.fromEntries(fd));
  if (!b.success) return fail("/admin/banners", b.error.issues[0].message);
  const v = { ...blank(b.data), starts_at: b.data.starts_at || null, ends_at: b.data.ends_at || null };
  const { error } = id
    ? await sb.from("banners").update(v).eq("id", id)
    : await sb.from("banners").insert(v);
  if (error) return fail("/admin/banners", error.message);
  try { await sb.rpc("log_admin_activity", { p_action: "banner_save", p_table_name: "banners", p_record_id: id || null }); } catch { /* non-fatal */ }
  refresh(); done("/admin/banners", id ? "Banner updated" : "Banner added");
}
export async function deleteBanner(id: string) {
  const { sb } = await requireAdmin();
  const { error } = await sb.from("banners").delete().eq("id", id);
  if (error) return fail("/admin/banners", error.message);
  refresh(); done("/admin/banners", "Banner deleted");
}

