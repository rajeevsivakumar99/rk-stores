import { supabaseServer } from "@/lib/supabase/server";
import { deleteHoliday, saveHoliday } from "@/app/admin/actions";
import { Field } from "@/components/ui";
import ImageUpload from "@/components/ImageUpload";
import ChannelPicker from "@/components/ChannelPicker";
import ConfirmButton from "@/components/ConfirmButton";
import { fmtDate, fmtTime } from "@/lib/util";

const KINDS: [string, string][] = [["holiday", "Full-day holiday"], ["festival", "Festival holiday"], ["unexpected_closure", "Unexpected closure"], ["temporary_closure", "Temporary closure"], ["special_hours", "Special opening hours"]];

export default async function AdminHolidays() {
  const { data } = await supabaseServer().from("holidays").select("*").order("start_date", { ascending: false }).limit(100);
  const kind = (h: any) => KINDS.find(([v]) => v === h.kind)?.[1];
  const dates = (h: any) => `${fmtDate(h.start_date)}${h.end_date ? ` – ${fmtDate(h.end_date)}` : ""}${h.special_closes_at ? ` (${fmtTime(h.special_opens_at)}–${fmtTime(h.special_closes_at)})` : ""}`;
  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Holidays &amp; closures</h1>
      <form action={saveHoliday} className="card mb-4 grid gap-3 sm:grid-cols-2 md:mb-6">
        <Field label="Type"><select name="kind" className="input">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Title"><input name="title" className="input" required /></Field>
        <Field label="Description" className="sm:col-span-2"><textarea name="description" rows={2} className="input" /></Field>
        <Field label="Start / holiday date"><input name="start_date" type="date" className="input" required /></Field>
        <Field label="End date (if multi-day)"><input name="end_date" type="date" className="input" /></Field>
        <Field label="Special opening time (special hours only)"><input name="special_opens_at" type="time" className="input" /></Field>
        <Field label="Special closing time (special hours only)"><input name="special_closes_at" type="time" className="input" /></Field>
        <div className="sm:col-span-2"><span className="label">Optional image</span><ImageUpload name="image_url" bucket="product-images" /></div>
        <div className="sm:col-span-2"><label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked /> Notify all customers now</label><ChannelPicker /></div>
        <div className="sm:col-span-2"><button className="btn w-full sm:w-auto">Save announcement</button></div>
      </form>
      <ul className="space-y-2 md:hidden">
        {data?.map((h: any) => (
          <li key={h.id} className="card !p-3">
            <p className="font-semibold">{h.title}</p><p className="text-xs text-slate-500">{kind(h)}</p><p className="text-sm text-slate-600">{dates(h)}</p>
            <form action={deleteHoliday.bind(null, h.id)} className="mt-2"><ConfirmButton message="Delete this announcement?" className="btn-danger w-full">Delete</ConfirmButton></form>
          </li>
        ))}
        {!data?.length && <li className="card text-center text-sm text-slate-500">No holiday announcements.</li>}
      </ul>
      <div className="card hidden overflow-x-auto !p-0 md:block"><table className="w-full"><thead className="border-b bg-slate-50"><tr><th className="th">Title</th><th className="th">Type</th><th className="th">Dates</th><th className="th"></th></tr></thead><tbody className="divide-y">
        {data?.map((h: any) => (
          <tr key={h.id}><td className="td font-medium">{h.title}</td><td className="td">{kind(h)}</td><td className="td">{dates(h)}</td>
            <td className="td"><form action={deleteHoliday.bind(null, h.id)}><ConfirmButton message="Delete this announcement?">Delete</ConfirmButton></form></td></tr>
        ))}
        {!data?.length && <tr><td className="td text-center text-slate-500" colSpan={4}>No holiday announcements.</td></tr>}
      </tbody></table></div>
    </>
  );
}
