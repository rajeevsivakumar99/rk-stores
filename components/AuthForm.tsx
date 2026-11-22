"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerWithPhone } from "@/app/actions/auth";
import { isEmail, normalizePhone, phoneToEmail } from "@/lib/util";
import { Icon } from "./Icons";
import ResendVerification from "./ResendVerification";
import { maskEmail } from "@/lib/mask-email";
import { safeInternalPath } from "@/lib/safe-redirect";

type Mode = "login" | "signup" | "pending";

/** One login / register screen for everyone. Admins and customers sign in here; the role decides where they land. */
export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [id, setId] = useState(""); // email or phone number
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState(""); // address a confirmation email was sent to
  const [startWait, setStartWait] = useState(0); // initial resend cooldown on the pending screen
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const reset = (m: Mode) => { setMode(m); setErr(""); setInfo(""); };

  /** After a successful sign-in: admins go to the admin panel, everyone else to the shop (or where they were going). */
  async function goHome(userId: string) {
    const sb = createClient();
    const { data: p } = await sb.from("profiles").select("role").eq("id", userId).maybeSingle();
    const isAdmin = p?.role === "admin" || p?.role === "super_admin";
    const next = new URLSearchParams(location.search).get("next");
    const safe = safeInternalPath(next);
    const dest = isAdmin ? (safe ?? "/admin") : safe && !safe.startsWith("/admin") ? safe : "/";
    router.push(dest);
    router.refresh();
  }

  async function login() {
    const sb = createClient();
    const value = id.trim();
    let email = value;
    if (!isEmail(value)) {
      const phone = normalizePhone(value);
      if (!phone) return setErr("Enter your email address or phone number.");
      email = phoneToEmail(phone);
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if ((error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) && isEmail(value)) {
        // Registered but never verified: explain, and let the customer ask for a new email themselves (no automatic resend).
        setPendingEmail(value); setStartWait(0);
        setMode("pending"); setInfo("Please verify your email address before logging in. Open the email we sent you and tap VERIFY EMAIL ADDRESS, or request a new one below.");
        return;
      }
      return setErr(/invalid login/i.test(error.message) ? "Wrong email/phone or password." : error.message);
    }
    await goHome(data.user.id);
  }

  async function signup() {
    const sb = createClient();
    const value = id.trim();
    if (!isEmail(value)) {
      // Phone number: free registration with phone + password (no SMS code).
      const res = await registerWithPhone({ full_name: name, phone: value, password });
      if (!res.ok) return setErr(res.error);
      const { data, error } = await sb.auth.signInWithPassword({ email: phoneToEmail(normalizePhone(value)), password });
      if (error) return setErr(error.message);
      return goHome(data.user.id);
    }
    // Email: Supabase emails a confirmation link (VERIFY EMAIL ADDRESS button) that must be clicked before the account works.
    const { data, error } = await sb.auth.signUp({
      email: value, password,
      options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) return setErr(error.message);
    if (data.user && data.user.identities?.length === 0) return setErr("This email is already registered. Please log in.");
    if (data.session) return goHome(data.user!.id); // email confirmation switched off in Supabase
    setPendingEmail(value); setStartWait(60);
    setMode("pending");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(""); setInfo("");
    try {
      if (mode === "login") await login();
      else if (mode === "signup") await signup();
    } catch (x: any) {
      setErr(/failed to fetch|network|load failed/i.test(x?.message ?? "") ? "Network problem. Check your connection and try again." : x?.message ?? "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  async function google() {
    const next = new URLSearchParams(location.search).get("next");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeInternalPath(next, "/") ?? "/")}` },
    });
    if (error) setErr(error.message);
  }

  const tab = (m: "login" | "signup", label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => reset(m)}
      className={`min-h-[44px] flex-1 rounded-xl text-sm font-semibold transition ${mode === m ? "bg-white text-brand-700 shadow-soft" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>
  );

  return (
    <div className="mx-auto mt-2 w-full max-w-md animate-fade-up md:mt-10">
      <div className="card !p-6 shadow-lift">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-extrabold text-white shadow-soft">RK</span>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">{mode === "pending" ? "Check your email" : mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="text-xs text-slate-500">{mode === "pending" ? "One more step to activate your account" : mode === "login" ? "Log in to continue shopping" : "It only takes a minute"}</p>
          </div>
        </div>

        {mode === "pending" ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700" aria-hidden="true">✉</span>
            <div>
              <p className="font-bold">Confirmation email sent</p>
              <p className="mt-1 text-sm text-slate-600">We sent a link to <strong className="break-all">{maskEmail(pendingEmail)}</strong>. Open the email and tap <strong>VERIFY EMAIL ADDRESS</strong> to activate your account.</p>
              <p className="mt-2 text-xs text-slate-500">Can&apos;t find it? Check your spam or junk folder.</p>
            </div>
            {info && <p className="rounded-xl bg-amber-50 px-3 py-2 text-left text-sm text-amber-800" role="status">{info}</p>}
            <ResendVerification email={pendingEmail} startWait={startWait} />
            <button type="button" onClick={() => reset("login")} className="btn w-full">Back to log in</button>
          </div>
        ) : (
          <>
            <div role="tablist" className="mb-4 flex gap-1 rounded-2xl bg-slate-100 p-1">{tab("login", "Log in")}{tab("signup", "Register")}</div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />}
              <input className="input" type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="Email or phone number" value={id} onChange={(e) => setId(e.target.value)} required autoComplete="username" />
              <div className="relative">
                <input className="input pr-12" type={show ? "text" : "password"} placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-slate-400 hover:text-slate-700"><Icon name={show ? "eyeoff" : "eye"} className="h-5 w-5" /></button>
              </div>
              {mode === "signup" && <p className="text-xs text-slate-500">Use your email (we will send a link to verify it), or just your phone number and a password.</p>}
              {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{err}</p>}
              {info && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700" role="status">{info}</p>}
              <button className="btn w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
            <button type="button" onClick={google} className="btn-outline w-full">
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              Continue with Google
            </button>
            {mode === "login" && <div className="mt-3 text-center"><Link href="/forgot-password" className="touch-link text-sm text-slate-500 hover:text-brand-700">Forgot password?</Link></div>}
          </>
        )}
      </div>
    </div>
  );
}
