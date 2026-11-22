"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import ResendVerification from "@/components/ResendVerification";

type View = "checking" | "success" | "login" | "expired" | "invalid" | "unknown";

/** Where the customer lands after clicking VERIFY EMAIL ADDRESS (see app/auth/callback/route.ts). Only fixed messages are shown: nothing from the URL is echoed. */
export default function VerifyEmail() {
  const [view, setView] = useState<View>("checking");

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    const status = q.get("status");
    const code = q.get("code") ?? h.get("error_code") ?? h.get("error");
    if (status === "success") setView("success");
    else if (status === "login") setView("login");
    else if (code === "otp_expired") setView("expired");
    else if (code) setView("invalid");
    else setView("unknown");
  }, []);

  const shell = (icon: string, tone: string, title: string, body: React.ReactNode) => (
    <div className="mx-auto mt-2 w-full max-w-md animate-fade-up md:mt-10">
      <div className="card !p-6 text-center shadow-lift">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-3xl ${tone}`} aria-hidden="true">{icon}</span>
        <h1 className="mt-4 text-xl font-extrabold">{title}</h1>
        {body}
      </div>
    </div>
  );

  if (view === "checking") return shell("…", "bg-slate-100 text-slate-500", "Checking your link…", null);

  if (view === "success") return shell("✓", "bg-green-100 text-green-700", "Email verified", (
    <>
      <p className="mt-2 text-sm text-slate-600">Thank you! Your email address is verified and your RK Stores account is ready. You are signed in.</p>
      <Link href="/" className="btn mt-5 w-full">Continue shopping</Link>
      <Link href="/account" className="touch-link mt-2 justify-center text-sm text-slate-500 hover:text-brand-700">Go to my account</Link>
    </>
  ));

  if (view === "login") return shell("✓", "bg-green-100 text-green-700", "Email verified", (
    <>
      <p className="mt-2 text-sm text-slate-600">Thank you! Your email address is verified. Please log in with your email and password to continue.</p>
      <Link href="/login" className="btn mt-5 w-full">Log in</Link>
    </>
  ));

  if (view === "unknown") return shell("?", "bg-slate-100 text-slate-500", "Verification status unknown", (
    <>
      <p className="mt-2 text-sm text-slate-600">We couldn&apos;t tell whether this link worked. Try logging in. If your email isn&apos;t verified yet, we&apos;ll help you get a new link.</p>
      <Link href="/login" className="btn mt-5 w-full">Go to log in</Link>
    </>
  ));

  const expired = view === "expired";
  return shell("!", "bg-amber-100 text-amber-700", expired ? "This link has expired" : "This link isn’t valid", (
    <>
      <p className="mt-2 text-sm text-slate-600">
        {expired
          ? "Verification links work once and expire after a while. This one has expired or was already used."
          : "This verification link is incomplete or no longer valid."}{" "}
        If you already verified your email, just log in. Otherwise we can send you a new link.
      </p>
      <div className="mt-4 text-left"><ResendVerification /></div>
      <Link href="/login" className="touch-link mt-2 justify-center text-sm text-slate-500 hover:text-brand-700">Back to log in</Link>
    </>
  ));
}
