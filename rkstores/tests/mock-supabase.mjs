// Minimal fake Supabase (PostgREST + Auth) used ONLY for local UI/responsive tests: node tests/mock-supabase.mjs
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 54321);
const BASE = `http://localhost:${PORT}`;
const now = new Date().toISOString();
const day = (n) => new Date(Date.now() + n * 864e5).toISOString();
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const cats = ["Stationery", "Gift Collection", "Toys", "Home Essentials", "Plastics Collection", "Festival Collection", "Fancy Coverings"]
  .map((name, i) => ({ id: uid(100 + i), name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), image_url: i % 2 ? `${BASE}/img/${i}.svg` : null, sort_order: i + 1 }));
const names = ["Gel Pen Pack of 10 (Blue, 0.5mm)", "A4 Notebook 200 pages ruled", "Premium gift box with ribbon and card", "Wooden toy train set with long name to test wrapping on small phones", "Plastic storage container 5L", "Diwali decorative diya set of 12", "Fancy gift wrapping paper roll", "Stapler Heavy Duty", "Teddy bear 30cm", "Steel water bottle 1L", "Rangoli colour set", "Clear packaging tape", "Soft toy giraffe", "Kitchen basket large", "Festival lights string 10m", "Marker set 24 colours"];
const qty = [20, 3, 0, 12, 8, 1, 30, 0, 6, 15, 2, 40, 0, 9, 4, 25];
const settings = { id: 1, store_name: "RK Stores", logo_url: null, description: "Your neighbourhood store for stationery, gifts, toys and more.", whatsapp_number: "919876543210", contact_number: "+91 98765 43210", address: "No. 12, 3rd Cross, Long Street Name Layout, Bengaluru, Karnataka 560001", maps_link: "https://maps.google.com/?q=rk", email: "contact.rkstores.longaddress@example.com", low_stock_threshold: 5, show_quantity: true, closing_notifications_enabled: true, advance_notice_minutes: 60, timezone: "Asia/Kolkata", updated_at: now };
const products = names.map((name, i) => {
  const c = cats[i % 7];
  return { id: uid(200 + i), product_code: `RK-${String(i + 1).padStart(8, "0")}`, name, category_id: c.id, description: i % 3 ? "Good quality product, long lasting and great value for money. Perfect for everyday use at home, school or office." : null, image_url: i % 4 === 3 ? null : `${BASE}/img/${i}.svg`, price: 25 + i * 37.5, quantity: qty[i], created_at: day(-i), updated_at: day(-i / 2), category_name: c.name, category_slug: c.slug,
    stock_status: qty[i] === 0 ? "out_of_stock" : qty[i] <= settings.low_stock_threshold ? "low_stock" : "available" };
});
const notifications = [
  { id: uid(300), title: "Closing soon", message: "Dear Customer, RK Stores will close at 9:00 PM today. Please visit us before closing.", image_url: null, type: "closing_reminder", channels: ["in_app", "email", "push"], sent_at: now, created_at: now },
  { id: uid(301), title: "New arrivals: Diwali collection", message: "Fresh stock of diyas, lights and rangoli colours has arrived. Visit the store or message us on WhatsApp for details and prices.", image_url: `${BASE}/img/5.svg`, type: "custom", channels: ["in_app"], sent_at: day(-1), created_at: day(-1) },
  { id: uid(302), title: "Holiday on Sunday", message: "The shop will remain closed this Sunday.", image_url: null, type: "holiday", channels: ["in_app", "email"], sent_at: day(-2), created_at: day(-2) },
];
const T = {
  profiles: [{ id: uid(1), role: "super_admin", full_name: "Test Admin", email: "admin@example.com", phone: "9999999999" }],
  store_settings: [settings],
  shop_timings: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, opens_at: "09:00:00", closes_at: "21:00:00", is_weekly_holiday: d === 0 })),
  categories: cats,
  products: products.map(({ category_name, category_slug, stock_status, ...r }) => r),
  products_view: products,
  offers_view: [0, 1, 2].map((i) => ({ id: uid(400 + i), title: i === 1 ? "Back to school stationery sale — up to 30% off on notebooks and pens" : `Festival offer ${i + 1}`, description: "Limited time offer on selected items.", image_url: i === 2 ? null : `${BASE}/img/${i}.svg`, discount_percent: i === 2 ? null : 10 + i * 10, discount_amount: i === 2 ? 50 : null, starts_at: day(-3), ends_at: day(7 + i), product_id: i === 0 ? products[0].id : null, category_id: null, is_active: true })),
  holidays: [{ id: uid(500), title: "Sunday weekly closure", description: "Shop closed all day.", kind: "holiday", start_date: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), end_date: null, special_opens_at: null, special_closes_at: null }],
  notifications,
  notification_deliveries: notifications.map((n, i) => ({ id: uid(600 + i), notification_id: n.id, user_id: uid(1), channel: "in_app", status: "delivered", read_at: i === 2 ? now : null, sent_at: n.sent_at })),
  notification_preferences: [{ user_id: uid(1), in_app: true, email: true, push: false }],
  price_history: [{ id: uid(700), product_id: products[0].id, old_price: 20, new_price: 25, changed_at: day(-1), changed_by: uid(1) }],
  stock_history: [{ id: uid(701), product_id: products[0].id, old_quantity: 10, new_quantity: 20, changed_at: day(-1), changed_by: uid(1) }],
  push_subscriptions: [],
};
const user = { id: uid(1), aud: "authenticated", role: "authenticated", email: "admin@example.com", app_metadata: {}, user_metadata: { full_name: "Test Admin" }, created_at: now };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function applyFilters(rows, params) {
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset", "or", "columns"].includes(k)) continue;
    const [op, ...rest] = v.split("."); const val = rest.join(".");
    if (op === "eq") rows = rows.filter((r) => String(r[k]) === val);
    else if (op === "neq") rows = rows.filter((r) => String(r[k]) !== val);
    else if (op === "in") rows = rows.filter((r) => val.replace(/[()]/g, "").split(",").includes(String(r[k])));
    else if (op === "ilike") { const needle = val.replace(/%/g, "").toLowerCase(); rows = rows.filter((r) => String(r[k] ?? "").toLowerCase().includes(needle)); }
    else if (op === "is") rows = rows.filter((r) => (val === "null" ? r[k] == null : String(r[k]) === val));
  }
  const order = params.get("order");
  if (order) for (const part of order.split(",").reverse()) { const [col, dir] = part.split("."); rows = [...rows].sort((a, b) => cmp(a[col], b[col]) * (dir === "desc" ? -1 : 1)); }
  return rows;
}
function embed(table, rows, select) {
  if (table === "categories" && /products\(count\)/.test(select)) return rows.map((c) => ({ ...c, products: [{ count: products.filter((p) => p.category_id === c.id).length }] }));
  if (/profiles\(/.test(select) && table.endsWith("_history")) return rows.map((r) => ({ ...r, profiles: { full_name: "Test Admin", email: "admin@example.com" } }));
  if (table === "notification_deliveries" && /notifications\(/.test(select)) return rows.map((r) => ({ ...r, notifications: notifications.find((n) => n.id === r.notification_id) }));
  return rows;
}

http.createServer((req, res) => {
  const url = new URL(req.url, BASE);
  const send = (code, body, headers = {}) => { res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range", ...headers }); res.end(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body)); };
  if (req.method === "OPTIONS") return send(204);
  const m = url.pathname.match(/^\/img\/(\d+)\.svg$/);
  if (m) { const hue = (Number(m[1]) * 47) % 360; return send(200, `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="hsl(${hue},60%,85%)"/><text x="300" y="320" font-size="90" text-anchor="middle" fill="hsl(${hue},40%,35%)">${m[1]}</text></svg>`, { "content-type": "image/svg+xml" }); }
  if (url.pathname === "/auth/v1/user") return send(200, user);
  if (url.pathname.startsWith("/auth/v1/")) return send(200, { access_token: "a.b.c", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user });
  const t = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (!t) return send(404, { message: "not found" });
  const table = t[1]; const data = T[table];
  if (!data) return send(404, { message: `unknown table ${table}` });
  if (req.method === "GET" || req.method === "HEAD") {
    let rows = applyFilters(data, url.searchParams);
    const total = rows.length;
    const lim = Number(url.searchParams.get("limit") ?? 1000); rows = embed(table, rows.slice(0, lim), url.searchParams.get("select") ?? "");
    const range = { "content-range": `0-${Math.max(total - 1, 0)}/${total}` };
    if (req.method === "HEAD") return send(200, undefined, range);
    if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return rows[0] ? send(200, rows[0], range) : send(406, { code: "PGRST116", message: "no rows", details: "The result contains 0 rows" });
    return send(200, rows, range);
  }
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    console.log(req.method, url.pathname, body.slice(0, 200));
    const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
    send(req.method === "POST" ? 201 : req.method === "DELETE" ? 204 : 200, req.method === "DELETE" ? undefined : single ? { id: uid(999) } : []);
  });
}).listen(PORT, () => console.log(`mock supabase on ${BASE}`));
