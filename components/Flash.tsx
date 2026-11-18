"use client";
import { useSearchParams } from "next/navigation";
export default function Flash() {
  const sp = useSearchParams();
  const msg = sp.get("msg"); const error = sp.get("error");
  if (!msg && !error) return null;
  return (
    <div className={`mx-auto mt-3 max-w-6xl rounded-lg px-4 py-2 text-sm ${error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`} role="status">
      {error ?? msg}
    </div>
  );
}
