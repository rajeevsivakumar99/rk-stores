// Server-side application log. Writes one line per event to  logs/app.log  (the folder is created automatically)
// and also prints it to the terminal. Never log passwords, tokens or full phone numbers.
//   log.info("cart.add", { product: id });   log.warn(...);   log.error("email.send_failed", { error: errMsg(e) });
// Turn file logging off with LOG_TO_FILE=false (it is also skipped automatically on Vercel, whose disk is read-only).
import fs from "fs";
import path from "path";

type Level = "INFO" | "WARN" | "ERROR";
const MAX_BYTES = 5 * 1024 * 1024; // when app.log passes 5 MB it is moved to app.log.1 and a new one starts
const toFile = !process.env.VERCEL && process.env.LOG_TO_FILE !== "false";

function write(level: Level, event: string, data?: Record<string, unknown>) {
  const line = `${new Date().toISOString()} [${level}] ${event}${data ? " " + JSON.stringify(data) : ""}`;
  (level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log)(line);
  if (!toFile) return;
  try {
    const dir = path.join(process.cwd(), "logs");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "app.log");
    try { if (fs.statSync(file).size > MAX_BYTES) fs.renameSync(file, file + ".1"); } catch { /* no file yet */ }
    fs.appendFileSync(file, line + "\n");
  } catch { /* logging must never break the app */ }
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) => write("INFO", event, data),
  warn: (event: string, data?: Record<string, unknown>) => write("WARN", event, data),
  error: (event: string, data?: Record<string, unknown>) => write("ERROR", event, data),
};
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
export const maskPhone = (p: string) => (p.length > 4 ? "*".repeat(p.length - 4) + p.slice(-4) : "****");
