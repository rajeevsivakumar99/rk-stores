import type { ReactNode } from "react";

export const Field = ({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) => (
  <label className={`block ${className}`}><span className="label">{label}</span>{children}</label>
);

export function Section({ title, id, href, children }: { title: string; id?: string; href?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-7 scroll-mt-20 md:mt-10">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 md:text-xl"><span className="h-5 w-1.5 rounded-full bg-brand-gradient" />{title}</h2>
        {href && <a href={href} className="touch-link text-sm font-semibold text-brand-600 hover:text-brand-800">View all →</a>}
      </div>
      {children}
    </section>
  );
}

export const Empty = ({ text }: { text: string }) => <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">{text}</p>;

const STATUS: Record<string, [string, string]> = {
  available: ["Available", "bg-green-100 text-green-800"],
  low_stock: ["Low Stock", "bg-amber-100 text-amber-800"],
  out_of_stock: ["Out of Stock", "bg-red-100 text-red-800"],
};
export const StatusBadge = ({ status }: { status: string }) => {
  const [label, cls] = STATUS[status] ?? STATUS.available;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${cls}`}>{label}</span>;
};
