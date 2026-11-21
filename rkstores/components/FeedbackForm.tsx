"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitFeedback } from "@/app/actions/feedback";

const MAX_BYTES = 3 * 1024 * 1024; // same limit as the storage bucket
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export default function FeedbackForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined) {
    setErr("");
    if (!f) return;
    if (!EXT[f.type]) { setErr("Please choose a PNG, JPG or WebP image."); return; }
    if (f.size > MAX_BYTES) { setErr("The screenshot is too large. Maximum size is 3 MB."); return; }
    setFile(f);
  }
  const clearFile = () => { setFile(null); if (fileRef.current) fileRef.current.value = ""; };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(false); setBusy(true);
    const sb = createClient();
    let path: string | null = null;
    try {
      if (file) {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("Please log in again and retry.");
        path = `${user.id}/${crypto.randomUUID()}.${EXT[file.type]}`;
        const up = await sb.storage.from("feedback").upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) { path = null; throw new Error(/not found|bucket/i.test(up.error.message) ? "Screenshot upload is not set up yet (the store owner must run migration 003). You can send the feedback without a screenshot." : `Screenshot upload failed: ${up.error.message}`); }
      }
      const res = await submitFeedback({ title, description: desc, screenshot_path: path });
      if (!res.ok) {
        if (path) await sb.storage.from("feedback").remove([path]); // do not leave an orphan file behind
        throw new Error(res.error);
      }
      setOk(true); setTitle(""); setDesc(""); clearFile();
      router.refresh();
    } catch (x: any) {
      setErr(x?.message ?? "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="fb-title">Title</label>
        <input id="fb-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required minLength={3} placeholder="e.g. Product photo not loading" />
      </div>
      <div>
        <label className="label" htmlFor="fb-desc">Description</label>
        <textarea id="fb-desc" className="input min-h-[130px] resize-y" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} required minLength={10} placeholder="Tell us what happened or what we can improve…" />
        <p className="mt-1 text-right text-xs text-slate-400">{desc.length} / 2000</p>
      </div>
      <div>
        <label className="label" htmlFor="fb-file">Screenshot <span className="font-normal text-slate-400">(optional)</span></label>
        {preview ? (
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <img src={preview} alt="Screenshot preview" className="h-24 w-24 rounded-xl object-cover" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{file?.name}</p>
              <p className="text-xs text-slate-500">{file ? (file.size / 1024).toFixed(0) : 0} KB</p>
              <button type="button" onClick={clearFile} className="touch-link mt-1 text-sm font-medium text-red-600">Remove</button>
            </div>
          </div>
        ) : (
          <label htmlFor="fb-file" className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50">
            <span className="text-2xl">📷</span>
            <span className="font-medium text-slate-700">Tap to add a screenshot</span>
            <span className="text-xs">PNG, JPG or WebP · up to 3 MB</span>
          </label>
        )}
        <input ref={fileRef} id="fb-file" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{err}</p>}
      {ok && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700" role="status">Thank you! Your feedback has been sent to the store.</p>}
      <button className="btn w-full sm:w-auto" disabled={busy}>{busy ? "Sending…" : "Send feedback"}</button>
    </form>
  );
}
