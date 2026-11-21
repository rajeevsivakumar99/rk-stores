import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDateTime } from "@/lib/util";

export default async function AdminActivityLogs() {
  const sb = supabaseServer();
  const { data: logs } = await sb
    .from("admin_activity_logs")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Admin activity logs</h1>
      <p className="mb-4 text-sm text-slate-500">Records actions taken by administrators (products, orders, coupons, banners, settings).</p>

      <ul className="space-y-2 md:hidden">
        {logs?.map((l: any) => (
          <li key={l.id} className="card !p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-semibold">{l.action}</p>
                <p className="text-xs text-slate-500">{l.table_name ?? "—"} · {l.record_id ?? "—"} · {fmtDateTime(l.created_at)}</p>
              </div>
              <div className="text-xs text-slate-500">{l.profiles?.full_name ?? l.profiles?.email ?? "—"}</div>
            </div>
            {l.details && <p className="mt-1 text-xs text-slate-400 break-all">{JSON.stringify(l.details)}</p>}
          </li>
        ))}
        {!logs?.length && <li className="card text-center text-sm text-slate-500">No activity logged yet.</li>}
      </ul>

      <div className="card hidden overflow-x-auto !p-0 md:block">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Action</th>
              <th className="th">Admin</th>
              <th className="th">Table</th>
              <th className="th">Record</th>
              <th className="th text-right">Time</th>
              <th className="th">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs?.map((l: any) => (
              <tr key={l.id} className="td">
                <td className="td">{l.action}</td>
                <td className="td">{l.profiles?.full_name ?? l.profiles?.email ?? "—"}</td>
                <td className="td">{l.table_name ?? "—"}</td>
                <td className="td">{l.record_id ?? "—"}</td>
                <td className="td text-right text-xs text-slate-500">{fmtDateTime(l.created_at)}</td>
                <td className="td text-xs">{l.details ? JSON.stringify(l.details) : "—"}</td>
              </tr>
            ))}
            {!logs?.length && <tr><td className="td text-center text-slate-500" colSpan={6}>No activity logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
