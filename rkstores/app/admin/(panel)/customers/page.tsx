import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminCustomers({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sb = supabaseServer();
  const term = (searchParams.q ?? "").replace(/[%,()]/g, " ").trim();
  let q = sb.from("profiles").select("*, notification_preferences(email,push)").order("created_at", { ascending: false });
  if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  if (searchParams.role) q = q.eq("role", searchParams.role);
  const { data: customers } = await q.limit(200);

  return (
    <>
      <h1 className="mb-3 text-xl font-bold md:text-2xl">Customers</h1>
      <form className="card mb-4 grid grid-cols-2 gap-2 !p-3 sm:grid-cols-4">
        <input
          name="q"
          type="search"
          defaultValue={term}
          placeholder="Search name, email or phone"
          aria-label="Search customers"
          className="input col-span-2 sm:col-span-1"
        />
        <select name="role" defaultValue={searchParams.role ?? ""} className="input" aria-label="Role">
          <option value="">All customers</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super admin</option>
        </select>
        <button className="btn col-span-2 sm:col-span-1">Filter</button>
      </form>

      <ul className="space-y-2 md:hidden">
        {customers?.map((c: any) => (
          <li key={c.id} className="card !p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-semibold">{c.full_name ?? c.email}</p>
                <p className="text-xs text-slate-500">{c.email ?? "—"} · {c.phone ?? "—"} · {c.role}</p>
              </div>
              <div className="text-xs font-semibold capitalize">{c.role}</div>
            </div>
          </li>
        ))}
        {!customers?.length && <li className="card text-center text-sm text-slate-500">No customers found.</li>}
      </ul>

      <div className="card hidden overflow-x-auto !p-0 md:block">
        <table className="w-full">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Phone</th>
              <th className="th">Role</th>
              <th className="th text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers?.map((c: any) => (
              <tr key={c.id} className="td">
                <td className="td">{c.full_name ?? "—"}</td>
                <td className="td">{c.email ?? "—"}</td>
                <td className="td">{c.phone ?? "—"}</td>
                <td className="td capitalize">{c.role}</td>
                <td className="td text-right text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!customers?.length && <tr><td className="td text-center text-slate-500" colSpan={5}>No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
