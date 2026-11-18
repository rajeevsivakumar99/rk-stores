import "./globals.css";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import Flash from "@/components/Flash";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: "RK Stores",
  description: "Browse products, check stock and enquire on WhatsApp.",
  applicationName: "RK Stores",
  appleWebApp: { capable: true, title: "RK Stores", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};
// viewport-fit=cover lets the app use the full screen on notched iPhones; safe-area insets are handled in the UI.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#4f46e5" };

// Stock, prices, offers and settings must always be live: never serve cached database responses.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans text-slate-800 antialiased">
        <Suspense fallback={null}><Flash /></Suspense>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
