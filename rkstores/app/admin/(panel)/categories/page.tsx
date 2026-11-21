import { supabaseServer } from "@/lib/supabase/server";
import { deleteCategory, saveCategory } from "@/app/admin/actions";
import { Field } from "@/components/ui";
import ImageUpload from "@/components/ImageUpload";
import ConfirmButton from "@/components/ConfirmButton";

export default async function AdminCategories() {
  const { data: cats } = await supabaseServer().from("categories").select("*, products(count)").order("sort_order");
  const form = (c?: any) => (
    <form action={saveCategory} className="grid gap-3 sm:grid-cols-[1fr_100px] sm:items-end">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Category name"><input name="name" className="input" defaultValue={c?.name} required /></Field>
      <Field label="Order"><input name="sort_order" type="number" className="input" defaultValue={c?.sort_order ?? 0} /></Field>
      <div className="sm:col-span-2"><ImageUpload name="image_url" bucket="product-images" initial={c?.image_url} /></div>
      <div className="sm:col-span-2"><button className="btn w-full sm:w-auto">{c ? "Save" : "Add category"}</button></div>
    </form>
  );
  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Categories</h1>
      <details className="card mb-4"><summary className="touch-link w-full cursor-pointer font-semibold">➕ Add category</summary><div className="mt-3">{form()}</div></details>
      <div className="grid gap-3 md:grid-cols-2">
        {cats?.map((c: any) => (
          <details key={c.id} className="card">
            <summary className="flex min-h-[44px] cursor-pointer items-center gap-3">
              {c.image_url ? <img src={c.image_url} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded bg-brand-50">🛍️</span>}
              <span className="font-semibold">{c.name}</span><span className="ml-auto text-xs text-slate-500">{c.products?.[0]?.count ?? 0} products</span>
            </summary>
            <div className="mt-3">{form(c)}
              <form action={deleteCategory.bind(null, c.id)} className="mt-2"><ConfirmButton message={`Delete category "${c.name}"?`} className="btn-danger w-full sm:w-auto">Delete category</ConfirmButton></form></div>
          </details>
        ))}
      </div>
    </>
  );
}
