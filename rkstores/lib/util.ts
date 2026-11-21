export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const money = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
export const isAdminRole = (r?: string | null) => r === "admin" || r === "super_admin";
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

// ---- Phone / email login helpers -------------------------------------------------------------------------
// Customers can register with a phone number + password without any paid SMS service. Internally the phone
// number is stored as a private, never-emailed address ("919876543210@phone.rkstores.invalid") so Supabase's
// free email+password login can be used. The real phone number is kept in the profile.
export const PHONE_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_PHONE_EMAIL_DOMAIN || "phone.rkstores.invalid";
export const isEmail = (v: string) => v.includes("@");
/** Digits only; a 10-digit Indian mobile number gets the 91 country code. Returns "" when it is not a valid number. */
export function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d.length >= 11 && d.length <= 15 ? d : "";
}
export const phoneToEmail = (digits: string) => `${digits}@${PHONE_EMAIL_DOMAIN}`;
export const isPhoneEmail = (e?: string | null) => !!e && e.toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);

export function waLink(num: string | null | undefined, store: string | null | undefined, product?: string) {
  const digits = (num ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const text = product
    ? `Hello ${store ?? "RK Stores"}, I am interested in ${product}. Please share more details.`
    : `Hello ${store ?? "RK Stores"}, I would like to know more.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function fmtTime(t?: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
export const fmtDate = (d: string | Date, tz = "Asia/Kolkata") =>
  new Date(d).toLocaleDateString("en-IN", { timeZone: tz, day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (d: string | Date, tz = "Asia/Kolkata") =>
  new Date(d).toLocaleString("en-IN", { timeZone: tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** YYYY-MM-DD of an instant in a given time zone. */
export const ymd = (d: string | Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(d));

/** Convert a wall-clock date+time in `tz` to a UTC Date. */
export function zonedToUtc(date: string, time: string, tz: string) {
  const guess = new Date(`${date}T${time}Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(guess).map((x) => [x.type, x.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

/** WhatsApp link that sends the whole cart as an order enquiry. */
export function waCartLink(
  num: string | null | undefined, store: string | null | undefined,
  lines: { name: string; qty: number; price: number }[], total: number, customer?: string | null
) {
  const digits = (num ?? "").replace(/\D/g, "");
  if (!digits || !lines.length) return null;
  const body = lines.map((l) => `• ${l.qty} × ${l.name} (${money(l.price)} each)`).join("\n");
  const text = `Hello ${store ?? "RK Stores"}, I would like to order:\n${body}\nTotal: ${money(total)}${customer ? `\nName: ${customer}` : ""}\nPlease confirm availability.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
