export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-11 rounded-xl bg-slate-200 md:hidden" />
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="flex gap-3 overflow-hidden">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-20 w-20 shrink-0 rounded-full bg-slate-200" />)}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200" />)}</div>
    </div>
  );
}
