import { supabaseServer } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { deleteOffer, saveOffer } from "@/app/admin/actions";
import { Field } from "@/components/ui";
import ImageUpload from "@/components/ImageUpload";
import ChannelPicker from "@/components/ChannelPicker";
import ConfirmButton from "@/components/ConfirmButton";
import { fmtDate, ymd } from "@/lib/util";

export default async function AdminOffers({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sb = supabaseServer();
  const s = await getSettings(); const tz = s?.timezone ?? "Asia/Kolkata";
  const [{ data: offers }, { data: products }, { data: cats }] = await Promise.all([
    sb.from("offers_view").select("*").order("starts_at", { ascending: false }),
    sb.from("products").select("id,name").order("name").limit(500),
    sb.from("categories").select("id,name").order("sort_order"),
  ]);
  const o = offers?.find((x: any) => x.id === searchParams.edit);
  const state = (x: any) => (x.is_active ? "Active" : new Date(x.starts_at) > new Date() ? "Scheduled" : "Expired");
  const badge = (x: any) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${x.is_active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>{state(x)}</span>;
  const disc = (x: any) => (x.discount_percent ? `${Number(x.discount_percent)}%` : `₹${Number(x.discount_amount)}`);
  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Offers &amp; promotions</h1>
      <form action={saveOffer} className="card mb-4 grid gap-3 sm:grid-cols-2 md:mb-6">
        <h2 className="font-semibold sm:col-span-2">{o ? `Edit offer: ${o.title}` : "Create offer"}</h2>
        {o && <input type="hidden" name="id" value={o.id} />}
        <Field label="Title" className="sm:col-span-2"><input name="title" className="input" defaultValue={o?.title} required /></Field>
        <Field label="Description" className="sm:col-span-2"><textarea name="description" rows={2} className="input" defaultValue={o?.description ?? ""} /></Field>
        <Field label="Discount %"><input name="discount_percent" type="number" inputMode="decimal" step="0.01" min="0" max="100" className="input" defaultValue={o?.discount_percent ?? ""} /></Field>
        <Field label="or Discount amount (₹)"><input name="discount_amount" type="number" inputMode="decimal" step="0.01" min="0" className="input" defaultValue={o?.discount_amount ?? ""} /></Field>
        <Field label="Start date"><input name="start_date" type="date" className="input" defaultValue={o ? ymd(o.starts_at, tz) : ""} required /></Field>
        <Field label="End date"><input name="end_date" type="date" className="input" defaultValue={o ? ymd(o.ends_at, tz) : ""} required /></Field>
        <Field label="Related product (optional)"><select name="product_id" className="input" defaultValue={o?.product_id ?? ""}><option value="">None</option>{products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Related category (optional)"><select name="category_id" className="input" defaultValue={o?.category_id ?? ""}><option value="">None</option>{cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <div className="sm:col-span-2"><span className="label">Offer image</span><ImageUpload name="image_url" bucket="product-images" initial={o?.image_url} /></div>
        <div className="sm:col-span-2">
          <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" name="notify" /> Notify all customers about this offer</label>
          <ChannelPicker />
        </div>
        <div className="grid gap-2 sm:col-span-2 sm:flex"><button className="btn">{o ? "Save offer" : "Create offer"}</button>{o && <a href="/admin/offers" className="btn-outline">Cancel</a>}</div>
      </form>

      <ul className="space-y-2 md:hidden">
        {offers?.map((x: any) => (
          <li key={x.id} className="card !p-3">
            <div className="flex items-start justify-between gap-2"><p className="font-semibold">{x.title}</p>{badge(x)}</div>
            <p className="text-sm text-slate-500">{disc(x)} off · {fmtDate(x.starts_at, tz)} – {fmtDate(x.ends_at, tz)}</p>
            <div className="mt-2 grid grid-cols-2 gap-2"><a href={`/admin/offers?edit=${x.id}`} className="btn-outline">Edit</a>
              <form action={deleteOffer.bind(null, x.id)}><ConfirmButton message="Delete this offer?" className="btn-danger w-full">Delete</ConfirmButton></form></div>
          </li>
        ))}
        {!offers?.length && <li className="card text-center text-sm text-slate-500">No offers yet.</li>}
      </ul>
      <div className="card hidden overflow-x-auto !p-0 md:block">
        <table className="w-full"><thead className="border-b bg-slate-50"><tr><th className="th">Offer</th><th className="th">Discount</th><th className="th">Valid</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody className="divide-y">
            {offers?.map((x: any) => (
              <tr key={x.id}><td className="td font-medium">{x.title}</td><td className="td">{disc(x)}</td>
                <td className="td">{fmtDate(x.starts_at, tz)} – {fmtDate(x.ends_at, tz)}</td><td className="td">{badge(x)}</td>
                <td className="td"><div className="flex gap-2"><a href={`/admin/offers?edit=${x.id}`} className="btn-outline !px-3 !text-xs">Edit</a>
                  <form action={deleteOffer.bind(null, x.id)}><ConfirmButton message="Delete this offer?">Delete</ConfirmButton></form></div></td></tr>
            ))}
            {!offers?.length && <tr><td className="td text-center text-slate-500" colSpan={5}>No offers yet.</td></tr>}
          </tbody></table>
      </div>
    </>
  );
}
