"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icons";

export default function NotificationBell({ userId, initial }: { userId: string; initial: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const sb = createClient();
    const refresh = async () => {
      const { count } = await sb.from("notification_deliveries").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("channel", "in_app").is("read_at", null);
      setCount(count ?? 0);
    };
    const ch = sb.channel(`inbox-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_deliveries", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [userId]);
  return (
    <Link href="/notifications" className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 active:bg-slate-200" aria-label={`Notifications, ${count} unread`}>
      <Icon name="bell" />
      {count > 0 && <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
