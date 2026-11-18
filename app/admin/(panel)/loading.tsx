export default function Loading() {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-200" />)}</div>
      <div className="h-48 rounded-2xl bg-slate-200" />
    </div>
  );
}
