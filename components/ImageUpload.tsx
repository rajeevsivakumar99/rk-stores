"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_SIDE = 1200;

/** Shrinks big phone photos (often 3-8 MB) to ~200 KB before upload: faster uploads for admins and faster pages for customers. */
async function shrink(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  const keep = { blob: file as Blob, ext: (file.name.split(".").pop() ?? "jpg").toLowerCase(), type: file.type };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return keep;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (blob && blob.size < file.size) return { blob, ext: "jpg", type: "image/jpeg" };
  } catch { /* fall back to the original file */ }
  return keep;
}

export default function ImageUpload({ name, bucket, initial }: { name: string; bucket: "product-images" | "store-assets"; initial?: string | null }) {
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 20 * 1024 * 1024) { setErr("Choose an image under 20 MB."); return; }
    setBusy(true); setErr("");
    const { blob, ext, type } = await shrink(f);
    const sb = createClient();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: type, cacheControl: "31536000" });
    if (error) setErr(error.message); else setUrl(sb.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {url ? <img src={url} alt="" className="h-20 w-20 rounded-xl border object-cover" /> : <div className="h-20 w-20 rounded-xl border border-dashed bg-slate-50" />}
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <label className="btn-outline cursor-pointer">
          {busy ? "Uploading…" : url ? "Change photo" : "Take / choose photo"}
          <input type="file" accept="image/*" onChange={onFile} className="sr-only" disabled={busy} />
        </label>
        {err && <p className="text-red-600" role="alert">{err}</p>}
        {url && <button type="button" className="touch-link block text-red-600 underline" onClick={() => setUrl("")}>Remove image</button>}
      </div>
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
