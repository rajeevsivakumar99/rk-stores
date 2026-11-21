"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Forgot() {
  const [email, setEmail] = useState(""); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
    if (error) setErr(error.message); else setMsg("If that email is registered, a reset link is on its way.");
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-2 w-full max-w-md card space-y-3 !p-5 md:mt-10">
      <h1 className="text-xl font-bold">Forgot password</h1>
      <p className="text-sm text-slate-500">Enter the email you registered with. If you signed up with a phone number only, please contact the store to reset your password.</p>
      <input className="input" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {err && <p className="text-sm text-red-600">{err}</p>}{msg && <p className="text-sm text-green-700">{msg}</p>}
      <button className="btn w-full">Send reset link</button>
    </form>
  );
}
