import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { setFeedbackStatus, deleteFeedback } from "@/app/admin/feedback-actions";
import ConfirmButton from "@/components/ConfirmButton";
import { fmtDateTime } from "@/lib/util";

const STATUS: Record<string, [string, string]> = {
  new: ["New", "bg-brand-100 text-brand-800"],
  reviewed: ["Reviewed", "bg-amber-100 text-amber-800"],
  resolved: ["Resolved", "bg-green-100 text-green-800"],
};
const FILTERS: [string, string][] = [["", "All"], ["new", "New"], ["reviewed", "Reviewed"], ["resolved", "Resolved"]];

export default async function AdminFeedback({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status && STATUS[searchParams.status] ? searchParams.status : "";
  let q = supabaseServer().from("feedback").select("id,title,description,screenshot_path,status,created_at,profiles(full_name,email,phone)").order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  const { data: items, error } = await q;

  if (error) {
    return <div className="card max-w-xl"><h1 className="text-xl font-bold">Feedback</h1><p className="mt-2 text-sm text-red-700">The feedback table is not set up yet. Run <code className="rounded bg-slate-100 px-1">supabase/migrations/003_daily_sales_feedback.sql</code> in Supabase, then reload.</p></div>;
  }

  // Screenshots live in a private bucket: create short-lived (1 hour) links for the admin.
  const paths = (items ?? []).map((f: any) => f.screenshot_path).filter(Boolean) as string[];
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabaseAdmin().storage.from("feedback").createSignedUrls(paths, 3600);
    (signed ?? []).forEach((s: any) => { if (s.signedUrl && s.path) urls.set(s.path, s.signedUrl); });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Customer feedback</h1>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {FILTERS.map(([k, l]) => <Link key={k || "all"} href={k ? `/admin/feedback?status=${k}` : "/admin/feedback"} className={`chip ${status === k ? "chip-active" : ""}`}>{l}</Link>)}
      </div>

      {!items?.length ? (
        <div className="card py-12 text-center"><p className="text-3xl">💬</p><p className="mt-2 font-semibold">No feedback {status ? `marked "${status}"` : "yet"}</p></div>
      ) : (
        <ul className="space-y-3">
          {items.map((f: any) => {
            const [label, tone] = STATUS[f.status] ?? STATUS.new;
            const shot = f.screenshot_path ? urls.get(f.screenshot_path) : null;
            const who = f.profiles?.full_name || f.profiles?.email || f.profiles?.phone || "Unknown";
            return (
              <li key={f.id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-bold leading-snug">{f.title}</h2>
                    <p className="text-xs text-slate-500">
                      {who}
                      {f.profiles?.phone && <> · <a href={`tel:+${f.profiles.phone}`} className="underline">{f.profiles.phone}</a></>}
                      {f.profiles?.email && <> · <a href={`mailto:${f.profiles.email}`} className="underline">{f.profiles.email}</a></>}
                      {" · "}{fmtDateTime(f.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{f.description}</p>
                {f.screenshot_path && (shot
                  ? <a href={shot} target="_blank" rel="noopener noreferrer" className="inline-block"><img src={shot} alt="Screenshot from the customer" loading="lazy" className="max-h-56 rounded-xl border border-slate-200 object-contain" /><span className="mt-1 block text-xs text-brand-700 underline">Open full size</span></a>
                  : <p className="text-xs text-slate-400">📷 Screenshot attached (could not be loaded)</p>)}
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <form action={setFeedbackStatus} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={f.id} />
                    {f.status !== "reviewed" && <button name="status" value="reviewed" className="btn-outline !min-h-[40px]">Mark reviewed</button>}
                    {f.status !== "resolved" && <button name="status" value="resolved" className="btn !min-h-[40px]">Mark resolved</button>}
                    {f.status !== "new" && <button name="status" value="new" className="btn-outline !min-h-[40px]">Reopen</button>}
                  </form>
                  <form action={deleteFeedback} className="ml-auto">
                    <input type="hidden" name="id" value={f.id} />
                    <ConfirmButton message="Delete this feedback (and its screenshot)?" className="touch-link text-sm text-red-600 underline">Delete</ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
