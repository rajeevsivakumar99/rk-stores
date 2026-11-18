"use client";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/** Search box that gets focus when opened from the "Search" tab (?search=1), even if already on the page. */
export default function SearchInput({ defaultValue }: { defaultValue: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const sp = useSearchParams();
  const wanted = sp.get("search");
  useEffect(() => { if (wanted) ref.current?.focus(); }, [wanted]);
  return <input ref={ref} type="search" name="q" defaultValue={defaultValue} enterKeyHint="search" placeholder="Search products" aria-label="Search products" className="input !rounded-full pl-10" />;
}
