// Pure helpers for daily sales: reminder timing and analytics maths. No database or framework code in here,
// so everything can be tested on its own.

/** Minutes before the end of the day at which an admin is reminded (2 hours, 1 hour, 30 minutes = urgent). */
export const REMINDER_STAGES = [30, 60, 120] as const;

/**
 * Which reminder (if any) should be sent right now?
 * Only the most urgent stage that is already due is considered, so a late scheduler never sends
 * an outdated "2 hours left" message when only 40 minutes remain.
 */
export function nextReminder(minsLeft: number, alreadySent: ReadonlySet<number>): number | null {
  if (!(minsLeft > 0)) return null;
  const target = REMINDER_STAGES.find((s) => minsLeft <= s);
  if (target === undefined) return null;
  return alreadySent.has(target) ? null : target;
}

export function reminderText(stage: number, store: string, closesAtLabel: string | null) {
  const when = closesAtLabel ? `${store} closes at ${closesAtLabel}` : "the day ends at midnight";
  if (stage <= 30) return { title: "URGENT: enter today's sales", message: `Only 30 minutes left! Please enter today's GPay and Cash amounts now - ${when}.`, urgent: true };
  if (stage <= 60) return { title: "1 hour left: enter today's sales", message: `Please enter today's GPay and Cash amounts. ${when} in about 1 hour.`, urgent: false };
  return { title: "Reminder: enter today's sales", message: `Please enter today's GPay and Cash amounts. ${when} in about 2 hours.`, urgent: false };
}

// ---------- dates (plain "YYYY-MM-DD" strings; no time zones involved) ----------
const MS = 86400000;
const toUtc = (d: string) => { const [y, m, day] = d.split("-").map(Number); return Date.UTC(y, m - 1, day); };
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fromUtc(toUtc(d) + n * MS);
export const weekdayOf = (d: string) => new Date(toUtc(d)).getUTCDay();
export const diffDays = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / MS);
export const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUtc(toUtc(s)) === s;

export type Range = { from: string; to: string; label: string };
export const PRESETS: [string, string][] = [["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"], ["month", "This month"], ["lastmonth", "Last month"], ["year", "This year"]];

/** Date range for a preset ("7d", "30d", "90d", "month", "lastmonth", "year") or a custom from/to. Max 366 days. */
export function rangeFor(preset: string | undefined, today: string, from?: string, to?: string): Range {
  if (isYmd(from) && isYmd(to) && from <= to) {
    const f = diffDays(from, to) > 365 ? addDays(to, -365) : from;
    return { from: f, to, label: `${f} to ${to}` };
  }
  const y = today.slice(0, 4), m = today.slice(5, 7);
  switch (preset) {
    case "7d": return { from: addDays(today, -6), to: today, label: "Last 7 days" };
    case "90d": return { from: addDays(today, -89), to: today, label: "Last 90 days" };
    case "month": return { from: `${y}-${m}-01`, to: today, label: "This month" };
    case "lastmonth": {
      const last = addDays(`${y}-${m}-01`, -1);
      return { from: `${last.slice(0, 7)}-01`, to: last, label: "Last month" };
    }
    case "year": return { from: `${y}-01-01`, to: today, label: "This year" };
    default: return { from: addDays(today, -29), to: today, label: "Last 30 days" };
  }
}

export type SaleRow = { sale_date: string; gpay_amount: number | string; cash_amount: number | string };
export type Day = { date: string; gpay: number; cash: number; total: number; entered: boolean };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function summarize(rows: SaleRow[], range: { from: string; to: string }, today: string) {
  const byDate = new Map(rows.map((r) => [r.sale_date, r]));
  const days: Day[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const r = byDate.get(d);
    const gpay = r ? Number(r.gpay_amount) : 0, cash = r ? Number(r.cash_amount) : 0;
    days.push({ date: d, gpay, cash, total: r2(gpay + cash), entered: !!r });
  }
  const entered = days.filter((d) => d.entered);
  const gpay = r2(entered.reduce((s, d) => s + d.gpay, 0));
  const cash = r2(entered.reduce((s, d) => s + d.cash, 0));
  const total = r2(gpay + cash);
  const sorted = [...entered].sort((a, b) => b.total - a.total);

  const wk = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const d of entered) { const w = wk[weekdayOf(d.date)]; w.sum += d.total; w.n += 1; }
  const weekdayAvg = wk.map((w) => (w.n ? r2(w.sum / w.n) : 0));

  const months = new Map<string, { gpay: number; cash: number; days: number }>();
  for (const d of entered) {
    const k = d.date.slice(0, 7);
    const m = months.get(k) ?? { gpay: 0, cash: 0, days: 0 };
    m.gpay += d.gpay; m.cash += d.cash; m.days += 1; months.set(k, m);
  }

  return {
    days, gpay, cash, total,
    gpayPct: total ? Math.round((gpay / total) * 1000) / 10 : 0,
    cashPct: total ? Math.round((cash / total) * 1000) / 10 : 0,
    enteredDays: entered.length,
    calendarDays: days.length,
    missingDays: days.filter((d) => !d.entered && d.date <= today).length,
    avgPerDay: entered.length ? r2(total / entered.length) : 0,
    best: sorted[0] ?? null,
    lowest: sorted.length ? sorted[sorted.length - 1] : null,
    weekdayAvg,
    months: [...months.entries()].sort().map(([month, v]) => ({ month, gpay: r2(v.gpay), cash: r2(v.cash), total: r2(v.gpay + v.cash), days: v.days })),
  };
}

/** The period of the same length immediately before `range`, for "vs previous period". */
export function previousRange(range: { from: string; to: string }) {
  const len = diffDays(range.from, range.to) + 1;
  return { from: addDays(range.from, -len), to: addDays(range.from, -1) };
}

/** Percentage change, or null when there is nothing to compare with. */
export const pctChange = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);

/** Groups days into weeks (Mon-Sun) so long ranges still make a readable chart. */
export function groupWeekly(days: Day[]): Day[] {
  const out = new Map<string, Day>();
  for (const d of days) {
    const wd = (weekdayOf(d.date) + 6) % 7; // Monday = 0
    const start = addDays(d.date, -wd);
    const g = out.get(start) ?? { date: start, gpay: 0, cash: 0, total: 0, entered: false };
    g.gpay = r2(g.gpay + d.gpay); g.cash = r2(g.cash + d.cash); g.total = r2(g.gpay + g.cash); g.entered = g.entered || d.entered;
    out.set(start, g);
  }
  return [...out.values()];
}

/** "2 h 5 min", "35 min", "closed" - how long until the day ends. */
export function fmtLeft(mins: number) {
  if (mins <= 0) return "closed";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}
