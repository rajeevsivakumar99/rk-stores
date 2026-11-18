import { saveProduct } from "@/app/admin/actions";
import { Field } from "./ui";
import ImageUpload from "./ImageUpload";

export default function ProductForm({ p, cats }: { p?: any; cats: any[] }) {
  return (
    <form action={saveProduct} className="grid gap-3 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Product name"><input name="name" className="input" defaultValue={p?.name} required maxLength={150} /></Field>
      <Field label="Category">
        <select name="category_id" className="input" defaultValue={p?.category_id ?? ""} required>
          <option value="" disabled>Select…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Selling price (₹)"><input name="price" type="number" inputMode="decimal" step="0.01" min="0" className="input" defaultValue={p?.price} required /></Field>
      <Field label="Available quantity"><input name="quantity" type="number" inputMode="numeric" step="1" min="0" className="input" defaultValue={p?.quantity ?? 0} required /></Field>
      <Field label="Description" className="sm:col-span-2"><textarea name="description" rows={3} className="input" defaultValue={p?.description ?? ""} maxLength={2000} /></Field>
      <div className="sm:col-span-2"><span className="label">Product image</span><ImageUpload name="image_url" bucket="product-images" initial={p?.image_url} /></div>
      <div className="sm:col-span-2"><button className="btn w-full sm:w-auto">{p ? "Save changes" : "Add product"}</button></div>
    </form>
  );
}
