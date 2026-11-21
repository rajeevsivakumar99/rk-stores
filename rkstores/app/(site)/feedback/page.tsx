import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/data";
import { fmtDateTime } from "@/lib/util";
import FeedbackForm from "@/components/FeedbackForm";

const STATUS: Record<string, [string, string]> = {
  new: ["Received", "bg-slate-100 text-slate-700"],
  reviewed: ["In review", "bg-amber-100 text-amber-800"],
  resolved: ["Resolved", "bg-green-100 text-green-800"],
};

export default async function FeedbackPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/feedback");
  const { data: mine } = await supabaseServer().from("feedback").select("id,title,status,created_at,screenshot_path").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);

  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">Send us feedback</h1>
        <p className="mt-1 text-sm text-slate-500">Found a problem or have an idea? Tell us. A screenshot helps, but it is optional.</p>
      </div>
      <div className="card"><FeedbackForm /></div>

      {!!mine?.length && (
        <div>
          <h2 className="mb-2 text-lg font-bold">Your earlier feedback</h2>
          <ul className="space-y-2">
            {mine.map((f: any) => {
              const [label, tone] = STATUS[f.status] ?? STATUS.new;
              return (
                <li key={f.id} className="card flex items-start justify-between gap-3 !p-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{f.title}</p>
                    <p className="text-xs text-slate-500">{fmtDateTime(f.created_at)}{f.screenshot_path ? " · 📷 screenshot attached" : ""}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
