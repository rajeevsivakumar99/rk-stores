"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isEmail } from "@/lib/util";

/** Maps a Supabase resend failure to a message the customer can act on. */
function explain(error: { message?: string; status?: number }): string {
  const m = error.message ?? "";
  if (error.status === 429 || /rate limit|too many|only request this after|seconds/i.test(m)) return "Please wait a minute before asking for another email.";
  if (/already/i.test(m)) return "This email address may already be verified. Try logging in.";
  if (error.status && error.status >= 500) return "We couldn't send the email right now. Please try again in a few minutes.";
  if (/sending|smtp|mail/i.test(m)) return "We couldn't send the email right now. Please try again in a few minutes.";
  return m || "Could not send the email. Please try again.";
}

/**
 * "Send me a new confirmation email" button with a cooldown.
 * Pass `email` when the address is already known (registration / login screens); leave it out to show an email box (expired-link page).
 * `startWait` is the initial cooldown in seconds: 60 right after an email was just sent, 0 otherwise.
 */
export default function ResendVerification({ email: known, startWait = 0 }: { email?: string; startWait?: number }) {
  const [typed, setTyped] = useState("");
  const [wait, setWait] = useState(startWait);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function resend() {
    const target = (known ?? typed).trim();
    if (!isEmail(target)) { setErr("Enter the email address you registered with."); return; }
    setBusy(true); setErr(""); setInfo("");
    try {
      // emailRedirectTo matters: without it Supabase sends the customer to the Site URL instead of /auth/callback.
      const { error } = await createClient().auth.resend({ type: "signup", email: target, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) setErr(explain(error));
      else { setWait(60); setInfo("A new confirmation email is on its way. Check your inbox and spam folder."); }
    } catch {
      setErr("Network problem. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {known === undefined && (
        <input className="input" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="Your email address" value={typed} onChange={(e) => setTyped(e.target.value)} />
      )}
      {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{err}</p>}
      {info && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700" role="status">{info}</p>}
      <button type="button" className="btn-outline w-full" onClick={resend} disabled={busy || wait > 0}>
        {busy ? "Sending…" : wait > 0 ? `Resend email in ${wait}s` : "Resend confirmation email"}
      </button>
    </div>
  );
}
