"use server";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { done, fail } from "@/lib/flash";
import { log } from "@/lib/logger";

const STATUSES = ["new", "reviewed", "resolved"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export async function setFeedbackStatus(fd: FormData) {
  const { sb, user } = await requireAdminUser();
  const id = str(fd.get("id")), status = str(fd.get("status"));
  if (!UUID.test(id) || !STATUSES.includes(status)) return fail("/admin/feedback", "Invalid request.");
  const { error } = await sb.from("feedback").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) { log.error("feedback.status_failed", { id, error: error.message }); return fail("/admin/feedback", error.message); }
  log.info("feedback.status", { id, status, by: user.id });
  revalidatePath("/admin/feedback"); revalidatePath("/admin");
  return done("/admin/feedback", `Marked as ${status}.`);
}

export async function deleteFeedback(fd: FormData) {
  const { sb, user } = await requireAdminUser();
  const id = str(fd.get("id"));
  if (!UUID.test(id)) return fail("/admin/feedback", "Invalid request.");
  const { data: row } = await sb.from("feedback").select("screenshot_path").eq("id", id).maybeSingle();
  const { error } = await sb.from("feedback").delete().eq("id", id);
  if (error) { log.error("feedback.delete_failed", { id, error: error.message }); return fail("/admin/feedback", error.message); }
  if (row?.screenshot_path) await supabaseAdmin().storage.from("feedback").remove([row.screenshot_path]);
  log.info("feedback.deleted", { id, by: user.id });
  revalidatePath("/admin/feedback"); revalidatePath("/admin");
  return done("/admin/feedback", "Feedback deleted.");
}
