import { NextRequest, NextResponse } from "next/server";
import { runClosingReminder } from "@/lib/scheduler";
import { runSalesReminders } from "@/lib/sales-reminders";
import { log, errMsg } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One endpoint for the scheduler (call it every 5 minutes). It runs two independent jobs:
 *  - closing: the customer "shop closes soon" reminder
 *  - sales:   the admin reminder to enter today's GPay + Cash totals (2 hours / 1 hour / 30 minutes before the day ends)
 * One job failing never stops the other.
 */
export async function GET(req: NextRequest) {
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("key");
  if (!process.env.CRON_SECRET || given !== process.env.CRON_SECRET) {
    log.warn("cron.closing.unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const run = async (name: string, job: () => Promise<unknown>) => {
    try { return await job(); }
    catch (e: any) { log.error(`cron.${name}.failed`, { error: errMsg(e) }); return { error: e?.message ?? "failed" }; }
  };
  const closing = await run("closing", runClosingReminder);
  const sales = await run("sales", runSalesReminders);
  log.info("cron.ran", { closing: closing as Record<string, unknown>, sales: sales as Record<string, unknown> });
  // Keep the old top-level shape so existing schedulers and tests that read "skipped"/"sent" still work.
  return NextResponse.json({ ...(closing as object), closing, sales });
}
