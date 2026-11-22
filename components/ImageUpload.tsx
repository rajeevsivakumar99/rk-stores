"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_SIDE = 1200;
const MAX_BYTES = 20 * 1024 * 1024;

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

/** Turns a raw upload failure into something an admin can act on. */
function uploadMessage(e: unknown): string {
  const m = (e as { message?: string } | null)?.message ?? "";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "You appear to be offline. Check your connection and try again.";
  if (/failed to fetch|network|load failed/i.test(m)) return "Network problem while uploading. Check your connection and try again.";
  if (/row-level security|not authorized|unauthorized|permission/i.test(m)) return "Upload not allowed. Please log in again as an admin and retry.";
  if (/bucket.*not found/i.test(m)) return "The image storage bucket was not found in Supabase. Check your Storage buckets.";
  return m ? `Could not upload the photo: ${m}` : "Could not upload the photo. Please try again.";
}

/**
 * Photo picker for the admin forms. Two buttons:
 *  - Take photo   -> opens the rear camera on phones/tablets (on a desktop browser it simply opens the file picker)
 *  - Choose photo -> opens the gallery / file picker
 * The uploaded image's public URL is submitted with the form through the hidden input named by `name`.
 */
export default function ImageUpload({ name, bucket, initial }: { name: string; bucket: "product-images" | "store-assets"; initial?: string | null }) {
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const guard = useRef<HTMLInputElement>(null);

  // While a photo is still uploading, block the surrounding form's Save button so the product is never saved without its new image.
  useEffect(() => {
    guard.current?.setCustomValidity(busy ? "Please wait until the photo finishes uploading." : "");
  }, [busy]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const f = input.files?.[0];
    input.value = ""; // lets the admin pick or take the same photo again after an error
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("That file is not an image. Please choose a photo."); return; }
    if (f.size === 0) { setErr("That photo is empty. Please try again."); return; }
    if (f.size > MAX_BYTES) { setErr("Choose an image under 20 MB."); return; }
    setBusy(true); setErr("");
    try {
      const { blob, ext, type } = await shrink(f);
      const sb = createClient();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: type, cacheControl: "31536000" });
      if (error) throw error;
      setUrl(sb.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    } catch (x) {
      setErr(uploadMessage(x));
    } finally {
      setBusy(false);
    }
  }

  const pick = `btn-outline cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {url ? <img src={url} alt="" className="h-20 w-20 rounded-xl border object-cover" /> : <div className="h-20 w-20 rounded-xl border border-dashed bg-slate-50" />}
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <div className="flex flex-wrap gap-2">
          <label className={pick}>
            Take photo
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" disabled={busy} />
          </label>
          <label className={pick}>
            Choose photo
            <input type="file" accept="image/*" onChange={onFile} className="sr-only" disabled={busy} />
          </label>
        </div>
        {busy && <p className="text-slate-500" role="status">Uploading…</p>}
        {err && <p className="text-red-600" role="alert">{err}</p>}
        {url && !busy && <button type="button" className="touch-link block text-red-600 underline" onClick={() => setUrl("")}>Remove image</button>}
      </div>
      <input type="hidden" name={name} value={url} />
      {/* Invisible validity guard (no name, never submitted): see the effect above. */}
      <input ref={guard} type="text" tabIndex={-1} aria-hidden="true" autoComplete="off" defaultValue="" className="sr-only" />
    </div>
  );
}
