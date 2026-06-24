import type { Metadata } from "next";

import "./globals.css";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";

import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Mock.shop — Hydrogen",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-black">
        <Providers>
          <Header />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {children}
          <Footer />
          <CartDrawer />
        </Providers>
        <Script
          src="https://cdn.shopify.com/storefront/standard-actions.js"
          type="module"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
