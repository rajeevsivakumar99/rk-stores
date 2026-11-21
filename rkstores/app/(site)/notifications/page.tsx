import { redirect } from "next/navigation";
import { getUser } from "@/lib/data";
import { supabaseServer } from "@/lib/supabase/server";
import { markAllRead, markRead } from "@/app/actions";
import { Empty } from "@/components/ui";
import { fmtDateTime } from "@/lib/util";

export default async function Notifications() {
  const user = await getUser();
  if (!user) redirect("/login");
  const { data } = await supabaseServer().from("notification_deliveries")
    .select("id,read_at,sent_at,notifications(title,message,image_url,type)")
    .eq("user_id", user.id).eq("channel", "in_app").order("sent_at", { ascending: false }).limit(100);
  const unread = (data ?? []).filter((d: any) => !d.read_at).length;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold md:text-2xl">Notifications {unread > 0 && <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-sm text-white">{unread}</span>}</h1>
        {unread > 0 && <form action={markAllRead}><button className="btn-outline">Mark all as read</button></form>}
      </div>
      {data?.length ? (
        <ul className="space-y-2">
          {data.map((d: any) => {
            const n = Array.isArray(d.notifications) ? d.notifications[0] : d.notifications;
            return (
              <li key={d.id} className={`card !p-3 sm:!p-4 ${d.read_at ? "" : "border-l-4 border-l-brand-500 bg-brand-50/40"}`}>
                <p className="font-semibold">{n?.title}</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{n?.message}</p>
                {n?.image_url && <img src={n.image_url} alt="" loading="lazy" decoding="async" className="mt-2 max-h-52 w-full rounded-xl object-cover sm:w-auto" />}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">{d.sent_at && fmtDateTime(d.sent_at)}</p>
                  {!d.read_at && <form action={markRead.bind(null, d.id)}><button className="touch-link px-2 text-sm font-medium text-brand-700">Mark read</button></form>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <Empty text="No notifications yet." />}
    </div>
  );
}
