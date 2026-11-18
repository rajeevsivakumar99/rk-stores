import { supabaseServer } from "@/lib/supabase/server";
import { sendAnnouncement } from "@/app/admin/actions";
import { Field } from "@/components/ui";
import ImageUpload from "@/components/ImageUpload";
import ChannelPicker from "@/components/ChannelPicker";
import { fmtDateTime } from "@/lib/util";

export default async function AdminNotifications() {
  const sb = supabaseServer();
  const { data: list } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  const ids = (list ?? []).map((n: any) => n.id);
  const { data: deliveries } = ids.length ? await sb.from("notification_deliveries").select("notification_id,channel,status").in("notification_id", ids).limit(20000) : { data: [] as any[] };
  const stats = new Map<string, Record<string, number>>();
  (deliveries ?? []).forEach((d: any) => {
    const m = stats.get(d.notification_id) ?? {};
    const k = `${d.channel}:${d.status}`; m[k] = (m[k] ?? 0) + 1; stats.set(d.notification_id, m);
  });
  const summary = (id: string) => {
    const m = stats.get(id); if (!m) return "—";
    return Object.entries(m).map(([k, v]) => `${k.replace(":", " ")} ×${v}`).join(", ");
  };
  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Notifications</h1>
      <form action={sendAnnouncement} className="card mb-4 space-y-3 md:mb-6">
        <h2 className="font-semibold">Send an announcement</h2>
        <p className="text-xs text-slate-500">New arrivals, festival greetings, store events, new collections, important information. Closing reminders are automatic (see Settings).</p>
        <Field label="Title"><input name="title" className="input" required maxLength={150} /></Field>
        <Field label="Message"><textarea name="message" rows={3} className="input" required maxLength={2000} /></Field>
        <div><span className="label">Optional image</span><ImageUpload name="image_url" bucket="product-images" /></div>
        <ChannelPicker />
        <button className="btn w-full sm:w-auto">Send to all customers</button>
      </form>
      <h2 className="mb-2 font-semibold">History</h2>
      <ul className="space-y-2 md:hidden">
        {list?.map((n: any) => (
          <li key={n.id} className="card !p-3">
            <p className="font-semibold">{n.title}</p>
            <p className="line-clamp-2 text-sm text-slate-600">{n.message}</p>
            <p className="mt-1 text-xs text-slate-500">{n.type} · {(n.channels ?? []).join(", ")} · {n.sent_at ? fmtDateTime(n.sent_at) : "Not sent"}</p>
            <p className="text-xs text-slate-500">Delivery: {summary(n.id)}</p>
          </li>
        ))}
        {!list?.length && <li className="card text-center text-sm text-slate-500">No notifications yet.</li>}
      </ul>
      <div className="card hidden overflow-x-auto !p-0 md:block"><table className="w-full">
        <thead className="border-b bg-slate-50"><tr><th className="th">Title / message</th><th className="th">Type</th><th className="th">Channels</th><th className="th">Sent</th><th className="th">Delivery</th></tr></thead>
        <tbody className="divide-y">
          {list?.map((n: any) => (
            <tr key={n.id}><td className="td"><p className="font-medium">{n.title}</p><p className="line-clamp-2 max-w-xs text-xs text-slate-500">{n.message}</p></td>
              <td className="td">{n.type}</td><td className="td">{(n.channels ?? []).join(", ")}</td>
              <td className="td">{n.sent_at ? fmtDateTime(n.sent_at) : "Not sent"}</td><td className="td text-xs">{summary(n.id)}</td></tr>
          ))}
          {!list?.length && <tr><td className="td text-center text-slate-500" colSpan={5}>No notifications yet.</td></tr>}
        </tbody></table></div>
    </>
  );
}
