import { getSettings, getTimings } from "@/lib/data";
import { saveSettings, saveTimings } from "@/app/admin/actions";
import { Field } from "@/components/ui";
import ImageUpload from "@/components/ImageUpload";
import { DAYS } from "@/lib/util";

export default async function AdminSettings() {
  const [s, timings] = await Promise.all([getSettings(), getTimings()]);
  const t = (d: number) => timings.find((x: any) => x.weekday === d) ?? {};
  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Store settings</h1>
      <form action={saveSettings} className="card mb-4 grid gap-3 sm:grid-cols-2 md:mb-6">
        <Field label="Store name"><input name="store_name" className="input" defaultValue={s?.store_name} required /></Field>
        <Field label="Email address"><input name="email" type="email" className="input" defaultValue={s?.email ?? ""} /></Field>
        <Field label="WhatsApp number (with country code, used for all enquiry buttons)"><input name="whatsapp_number" className="input" placeholder="919876543210" defaultValue={s?.whatsapp_number ?? ""} /></Field>
        <Field label="Store contact number"><input name="contact_number" className="input" defaultValue={s?.contact_number ?? ""} /></Field>
        <Field label="Store address" className="sm:col-span-2"><textarea name="address" rows={2} className="input" defaultValue={s?.address ?? ""} /></Field>
        <Field label="Google Maps link" className="sm:col-span-2"><input name="maps_link" type="url" className="input" defaultValue={s?.maps_link ?? ""} /></Field>
        <Field label="Store description" className="sm:col-span-2"><textarea name="description" rows={2} className="input" defaultValue={s?.description ?? ""} /></Field>
        <div className="sm:col-span-2"><span className="label">Store logo</span><ImageUpload name="logo_url" bucket="store-assets" initial={s?.logo_url} /></div>
        <Field label="Low-stock threshold (low stock = quantity from 1 up to this number)"><input name="low_stock_threshold" type="number" min="0" className="input" defaultValue={s?.low_stock_threshold ?? 5} required /></Field>
        <Field label="Time zone"><input name="timezone" className="input" defaultValue={s?.timezone ?? "Asia/Kolkata"} required /></Field>
        <Field label="Closing reminder: minutes before closing"><input name="advance_notice_minutes" type="number" min="0" max="1440" className="input" defaultValue={s?.advance_notice_minutes ?? 60} required /></Field>
        <div className="self-end text-sm">
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="closing_notifications_enabled" defaultChecked={s?.closing_notifications_enabled} /> Send automatic closing reminders</label>
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="show_quantity" defaultChecked={s?.show_quantity} /> Show available quantity to customers</label>
        </div>
        <div className="sm:col-span-2"><button className="btn w-full sm:w-auto">Save store settings</button></div>
      </form>

      <form action={saveTimings} className="card">
        <h2 className="mb-1 font-semibold">Shop timings</h2>
        <p className="mb-3 text-xs text-slate-500">Set different hours per day. Tick “Weekly holiday” to close that day (no closing reminder is sent).</p>
        <div className="space-y-2">
          {DAYS.map((name, d) => (
            <div key={d} className="grid grid-cols-2 items-center gap-2 border-b pb-2 sm:grid-cols-[110px_140px_140px_1fr] sm:border-0 sm:pb-0">
              <span className="col-span-2 text-sm font-semibold sm:col-span-1">{name}</span>
              <input type="time" name={`opens_${d}`} className="input" defaultValue={t(d).opens_at?.slice(0, 5) ?? ""} aria-label={`${name} opening`} />
              <input type="time" name={`closes_${d}`} className="input" defaultValue={t(d).closes_at?.slice(0, 5) ?? ""} aria-label={`${name} closing`} />
              <label className="col-span-2 flex min-h-[44px] items-center gap-2 text-sm sm:col-span-1"><input type="checkbox" name={`holiday_${d}`} defaultChecked={t(d).is_weekly_holiday} /> Weekly holiday</label>
            </div>
          ))}
        </div>
        <button className="btn mt-4 w-full sm:w-auto">Save timings</button>
      </form>
    </>
  );
}
