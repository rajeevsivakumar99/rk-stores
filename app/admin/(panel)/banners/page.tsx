import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { saveBanner, deleteBanner } from "@/app/admin/actions";
import ConfirmButton from "@/components/ConfirmButton";
import ImageUpload from "@/components/ImageUpload";

export default async function AdminBanners({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sb = supabaseServer();
  const { data: banners } = await sb.from("banners").select("*").order("position").order("sort_order").limit(200);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold md:text-2xl">Banner management</h1>
        <Link href="/admin/banners?new=1" className="btn">➕ Add banner</Link>
      </div>

      {searchParams.new && (
        <details className="card mb-4" open>
          <summary className="touch-link w-full cursor-pointer font-semibold">➕ New banner</summary>
          <div className="mt-3">
            <form action={saveBanner} className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <input name="title" placeholder="Banner title" className="input" required />
              <input name="subtitle" placeholder="Subtitle" className="input" />
              <div className="sm:col-span-2"><span className="label">Image</span><ImageUpload name="image_url" bucket="store-assets" /></div>
              <input name="link_url" type="url" placeholder="Link URL" className="input" />
              <select name="position" className="input">
                <option value="home">Home page</option>
                <option value="category">Category page</option>
                <option value="top">Top bar</option>
              </select>
              <input name="sort_order" type="number" min="0" defaultValue="0" placeholder="Sort order" className="input" />
              <input name="starts_at" type="datetime-local" className="input" />
              <input name="ends_at" type="datetime-local" className="input" />
              <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="active" defaultChecked /> Active</label>
              <button className="btn col-span-2 sm:col-span-auto">Save banner</button>
            </form>
          </div>
        </details>
      )}

      <ul className="space-y-2 md:hidden">
        {banners?.map((b: any) => (
          <li key={b.id} className="card !p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-semibold">{b.title}</p>
                <p className="text-xs text-slate-500">{b.subtitle ?? ""} · {b.position} · {b.active ? "Active" : "Inactive"}</p>
              </div>
              <div className="flex items-center gap-2">
                <form action={deleteBanner.bind(null, b.id)}><ConfirmButton message={`Delete banner "${b.title}"?`} className="btn-danger text-xs">Delete</ConfirmButton></form>
              </div>
            </div>
          </li>
        ))}
        {!banners?.length && <li className="card text-center text-sm text-slate-500">No banners yet.</li>}
      </ul>

      <div className="card hidden overflow-x-auto !p-0 md:block">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Title</th>
              <th className="th">Subtitle</th>
              <th className="th">Image</th>
              <th className="th">Position</th>
              <th className="th text-center">Sort</th>
              <th className="th">Active</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {banners?.map((b: any) => (
              <tr key={b.id} className="td">
                <td className="td">{b.title}</td>
                <td className="td">{b.subtitle ?? "—"}</td>
                <td className="td">{b.image_url ? <img src={b.image_url} alt="" className="h-8 w-8 rounded object-cover" /> : "—"}</td>
                <td className="td">{b.position}</td>
                <td className="td text-center">{b.sort_order}</td>
                <td className="td">{b.active ? "✅" : "❌"}</td>
                <td className="td">
                  <form action={deleteBanner.bind(null, b.id)}><ConfirmButton message={`Delete banner "${b.title}"?`} className="btn-danger text-xs">Delete</ConfirmButton></form>
                </td>
              </tr>
            ))}
            {!banners?.length && <tr><td className="td text-center text-slate-500" colSpan={7}>No banners yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
