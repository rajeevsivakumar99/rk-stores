import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/data";
import { supabaseServer } from "@/lib/supabase/server";
import { signOut, updateProfile } from "@/app/actions";
import { Field } from "@/components/ui";
import { isAdminRole } from "@/lib/util";
import PrefsPanel from "@/components/PrefsPanel";

export default async function Account() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user) redirect("/login");
  const { data: pref } = await supabaseServer().from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
  return (
    <div className="mx-auto max-w-lg space-y-3 md:space-y-4">
      <h1 className="text-xl font-bold md:text-2xl">My account</h1>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/notifications" className="btn-outline">🔔 Notifications</Link>
        {isAdminRole(profile?.role) ? <Link href="/admin" className="btn-outline">⚙️ Admin panel</Link> : <Link href="/offers" className="btn-outline">🏷️ Offers</Link>}
      </div>
      <form action={updateProfile} className="card space-y-3">
        <p className="break-all text-sm text-slate-500">Signed in as {profile?.email ?? profile?.phone ?? "—"}</p>
        <Field label="Full name"><input name="full_name" className="input" defaultValue={profile?.full_name ?? ""} required autoComplete="name" /></Field>
        <Field label="Phone"><input name="phone" type="tel" inputMode="tel" className="input" defaultValue={profile?.phone ?? ""} autoComplete="tel" /></Field>
        <button className="btn w-full sm:w-auto">Save profile</button>
      </form>
      <PrefsPanel email={pref?.email !== false} push={!!pref?.push} />
      <form action={signOut}><button className="btn-outline w-full">Log out</button></form>
    </div>
  );
}
