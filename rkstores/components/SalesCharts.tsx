import type { Day } from "@/lib/sales-logic";
import { money } from "@/lib/util";

// Pure SVG / CSS charts: no chart library and no client-side JavaScript. GPay = indigo, Cash = green.
export const GPAY_COLOR = "#6366f1";
export const CASH_COLOR = "#10b981";

const compact = (n: number) => (n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(Math.round(n)));
function niceMax(max: number) {
  if (max <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(max));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function StackedBars({ days, weekly = false }: { days: Day[]; weekly?: boolean }) {
  const W = Math.max(320, days.length * 28), H = 250, L = 46, R = 8, T = 12, B = 34;
  const max = niceMax(Math.max(...days.map((d) => d.total), 1));
  const bw = (W - L - R) / Math.max(days.length, 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const every = Math.max(1, Math.ceil(days.length / Math.floor((W - L) / 44)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: W }} role="img" aria-label="Daily sales, GPay and Cash">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">{compact(t)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = L + i * bw + bw * 0.15, w = bw * 0.7;
          return (
            <g key={d.date}>
              <title>{`${weekly ? "Week of " : ""}${d.date}: GPay ${money(d.gpay)} + Cash ${money(d.cash)} = ${money(d.total)}${d.entered ? "" : " (not entered)"}`}</title>
              {d.entered ? (
                <>
                  <rect x={x} y={y(d.gpay)} width={w} height={Math.max(0, y(0) - y(d.gpay))} fill={GPAY_COLOR} rx="2" />
                  <rect x={x} y={y(d.total)} width={w} height={Math.max(0, y(d.gpay) - y(d.total))} fill={CASH_COLOR} rx="2" />
                </>
              ) : <rect x={x} y={y(0) - 3} width={w} height={3} fill="#cbd5e1" rx="1.5" />}
              {i % every === 0 && <text x={x + w / 2} y={H - 16} textAnchor="middle" fontSize="10" fill="#64748b">{d.date.slice(8)}/{d.date.slice(5, 7)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function SplitDonut({ gpay, cash }: { gpay: number; cash: number }) {
  const total = gpay + cash;
  const gp = total ? (gpay / total) * 100 : 0;
  return (
    <div className="relative mx-auto h-40 w-40 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${GPAY_COLOR} 0 ${gp}%, ${CASH_COLOR} ${gp}% 100%)` : "#e2e8f0" }}>
      <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Total</span>
        <span className="text-sm font-extrabold">{money(total)}</span>
      </div>
    </div>
  );
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function WeekdayBars({ avg }: { avg: number[] }) {
  const max = Math.max(...avg, 1);
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  const best = avg.indexOf(Math.max(...avg));
  return (
    <ul className="space-y-2">
      {order.map((i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <span className="w-9 shrink-0 text-slate-500">{WD[i]}</span>
          <span className="h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span className={`block h-full rounded-full ${i === best && avg[i] > 0 ? "bg-brand-gradient" : "bg-brand-300"}`} style={{ width: `${(avg[i] / max) * 100}%` }} />
          </span>
          <span className="w-24 shrink-0 text-right font-medium">{avg[i] ? money(avg[i]) : "-"}</span>
        </li>
      ))}
    </ul>
  );
}
