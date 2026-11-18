"use client";
import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription, setEmailPref } from "@/app/actions";

function keyToBytes(b64: string) {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function PrefsPanel({ email, push }: { email: boolean; push: boolean }) {
  const [em, setEm] = useState(email);
  const [pu, setPu] = useState(push);
  const [msg, setMsg] = useState("");
  const [supported, setSupported] = useState(true);
  useEffect(() => { setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window); }, []);

  async function toggleEmail() { const v = !em; setEm(v); await setEmailPref(v); }

  async function togglePush() {
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      if (!pu) {
        if ((await Notification.requestPermission()) !== "granted") { setMsg("Notifications are blocked. Allow them in your browser's site settings."); return; }
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key) { setMsg("Push is not configured on this site yet."); return; }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) as BufferSource });
        await savePushSubscription(JSON.parse(JSON.stringify(sub)));
        setPu(true);
      } else {
        const sub = await reg.pushManager.getSubscription();
        await removePushSubscription(sub?.endpoint ?? "");
        await sub?.unsubscribe();
        setPu(false);
      }
    } catch (e: any) { setMsg(e?.message ?? "Could not change push settings."); }
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Notification settings</h2>
      <label className="flex min-h-[44px] items-center justify-between gap-3 text-sm"><span>Email notifications</span>
        <input type="checkbox" checked={em} onChange={toggleEmail} className="h-5 w-5" /></label>
      <label className="flex min-h-[44px] items-center justify-between gap-3 text-sm"><span>Browser push notifications{!supported && " (not supported on this browser)"}</span>
        <input type="checkbox" checked={pu} onChange={togglePush} disabled={!supported} className="h-5 w-5" /></label>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
