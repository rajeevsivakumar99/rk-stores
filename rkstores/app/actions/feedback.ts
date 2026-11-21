"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyAdmins } from "@/lib/notify";
import { log, errMsg } from "@/lib/logger";

const Schema = z.object({
  title: z.string().trim().min(3, "Please enter a short title (at least 3 characters).").max(120, "The title is too long (120 characters max)."),
  description: z.string().trim().min(10, "Please describe it in at least 10 characters.").max(2000, "The description is too long (2000 characters max)."),
  screenshot_path: z.string().max(300).nullable().optional(),
});

export type FeedbackResult = { ok: true } | { ok: false; error: string };

/**
 * Saves feedback. The screenshot (optional) is uploaded by the browser straight to the private "feedback" bucket first;
 * this action only receives its path and checks that it lies inside the user's own folder.
 */
export async function submitFeedback(input: { title: string; description: string; screenshot_path?: string | null }): Promise<FeedbackResult> {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Please log in to send feedback." };

  const p = Schema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const path = p.data.screenshot_path || null;
  if (path && !new RegExp(`^${user.id}/[A-Za-z0-9-]+\\.(png|jpg|jpeg|webp)$`).test(path)) {
    log.warn("feedback.bad_screenshot_path", { user: user.id });
    return { ok: false, error: "That screenshot could not be accepted. Please try again." };
  }

  // Simple spam guard: at most 5 feedback messages per hour per person.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from("feedback").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 5) return { ok: false, error: "You have sent several messages in the last hour. Please try again a little later." };

  const { error } = await sb.from("feedback").insert({ user_id: user.id, title: p.data.title, description: p.data.description, screenshot_path: path });
  if (error) {
    log.error("feedback.save_failed", { user: user.id, error: error.message });
    return { ok: false, error: /does not exist|schema cache/i.test(error.message) ? "Feedback is not set up yet. The store owner needs to run the database update (migration 003)." : "Could not save your feedback. Please try again." };
  }
  log.info("feedback.received", { user: user.id, screenshot: !!path });

  // Tell the admins (never blocks or fails the submission).
  try {
    const { data: me } = await sb.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    await notifyAdmins(supabaseAdmin(), {
      title: `New feedback: ${p.data.title.slice(0, 60)}`,
      message: `${me?.full_name ?? "A customer"}: ${p.data.description.slice(0, 160)}`,
      type: "feedback", channels: ["in_app", "push"], url: "/admin/feedback",
    });
  } catch (e) { log.warn("feedback.notify_failed", { error: errMsg(e) }); }

  revalidatePath("/feedback");
  revalidatePath("/admin/feedback");
  return { ok: true };
}
