"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-20 max-w-md card text-center">
      <h1 className="text-lg font-bold">Something went wrong</h1>
      <p className="mt-1 text-sm text-slate-600">{error.message || "Please try again."}</p>
      <button onClick={reset} className="btn mt-4">Try again</button>
    </div>
  );
}
