"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerWithPhone } from "@/app/actions/auth";
import { isEmail, normalizePhone, phoneToEmail } from "@/lib/util";
import { Icon } from "./Icons";

type Mode = "login" | "signup" | "verify";

/** One login / register screen for everyone. Admins and customers sign in here; the role decides where they land. */
export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [id, setId] = useState(""); // email or phone number
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [wait, setWait] = useState(0); // resend cooldown (seconds)

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const reset = (m: Mode) => { setMode(m); setErr(""); setInfo(""); setCode(""); };

  /** After a successful sign-in: admins go to the admin panel, everyone else to the shop (or where they were going). */
  async function goHome(userId: string) {
    const sb = createClient();
    const { data: p } = await sb.from("profiles").select("role").eq("id", userId).maybeSingle();
    const isAdmin = p?.role === "admin" || p?.role === "super_admin";
    const next = new URLSearchParams(location.search).get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
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
      if (/not confirmed/i.test(error.message) && isEmail(value)) {
        // Email registered but never verified: send a fresh code and ask for it.
        await sb.auth.resend({ type: "signup", email: value });
        setVerifyEmail(value); setWait(60);
        setMode("verify"); setInfo("Please verify your email first. We sent a code to " + value + ".");
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
    // Email: Supabase emails a verification code (and link) that must be confirmed before the account works.
    const { data, error } = await sb.auth.signUp({
      email: value, password,
      options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) return setErr(error.message);
    if (data.user && data.user.identities?.length === 0) return setErr("This email is already registered. Please log in.");
    if (data.session) return goHome(data.user!.id); // email confirmation switched off in Supabase
    setVerifyEmail(value); setWait(60);
    setMode("verify"); setInfo("We sent a verification code to " + value + ". Enter it below.");
  }

  async function verify() {
    const sb = createClient();
    const { data, error } = await sb.auth.verifyOtp({ email: verifyEmail, token: code.trim(), type: "signup" });
    if (error) return setErr(error.message.includes("expired") || error.message.includes("invalid") ? "That code is wrong or has expired. Request a new one." : error.message);
    if (data.user) await goHome(data.user.id);
  }

  async function resend() {
    setErr(""); setInfo("");
    const { error } = await createClient().auth.resend({ type: "signup", email: verifyEmail });
    if (error) return setErr(error.message);
    setWait(60); setInfo("A new code has been sent.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(""); setInfo("");
    try {
      if (mode === "login") await login();
      else if (mode === "signup") await signup();
      else await verify();
    } catch (x: any) { setErr(x?.message ?? "Something went wrong. Please try again."); }
    setBusy(false);
  }

  async function google() {
    const next = new URLSearchParams(location.search).get("next");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
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
            <h1 className="text-xl font-extrabold leading-tight">{mode === "verify" ? "Verify your email" : mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="text-xs text-slate-500">{mode === "verify" ? "Enter the code we emailed you" : mode === "login" ? "Log in to continue shopping" : "It only takes a minute"}</p>
          </div>
        </div>

        {mode !== "verify" && <div role="tablist" className="mb-4 flex gap-1 rounded-2xl bg-slate-100 p-1">{tab("login", "Log in")}{tab("signup", "Register")}</div>}

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />}
          {mode !== "verify" && (
            <>
              <input className="input" type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="Email or phone number" value={id} onChange={(e) => setId(e.target.value)} required autoComplete="username" />
              <div className="relative">
                <input className="input pr-12" type={show ? "text" : "password"} placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-slate-400 hover:text-slate-700"><Icon name={show ? "eyeoff" : "eye"} className="h-5 w-5" /></button>
              </div>
              {mode === "signup" && <p className="text-xs text-slate-500">Use your email to get a verification code, or just your phone number and a password.</p>}
            </>
          )}
          {mode === "verify" && (
            <input className="input text-center text-xl font-bold tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} required />
          )}
          {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{err}</p>}
          {info && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700" role="status">{info}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Verify & continue"}</button>
        </form>

        {mode === "verify" ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" onClick={resend} disabled={wait > 0} className="touch-link font-medium text-brand-700 disabled:text-slate-400">{wait > 0 ? `Resend code in ${wait}s` : "Resend code"}</button>
            <button type="button" onClick={() => reset("login")} className="touch-link text-slate-500 hover:text-slate-800">Back to log in</button>
          </div>
        ) : (
          <>
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
