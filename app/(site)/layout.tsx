import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { getProfile, getCartCount } from "@/lib/data";
import { isAdminRole } from "@/lib/util";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, cartCount] = await Promise.all([getProfile(), getCartCount()]);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-4 pt-3 md:pt-5">{children}</main>
      <Footer />
      <BottomNav loggedIn={!!profile} isAdmin={isAdminRole(profile?.role)} cartCount={cartCount} />
    </>
  );
}
