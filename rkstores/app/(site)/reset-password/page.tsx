"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Reset() {
  const router = useRouter();
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const { error } = await createClient().auth.updateUser({ password: pw });
    if (error) setErr(error.message); else router.push("/?msg=Password+updated");
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-2 w-full max-w-md card space-y-3 !p-5 md:mt-10">
      <h1 className="text-xl font-bold">Choose a new password</h1>
      <input className="input" type="password" minLength={8} required placeholder="New password (min 8 characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn w-full">Update password</button>
    </form>
  );
}
