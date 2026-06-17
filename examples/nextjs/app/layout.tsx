import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";
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
import { cartHandlers } from "@/lib/cart-handlers";
import { getStorefrontClient } from "@/lib/storefront";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Mock.shop — Hydrogen",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const storefrontClient = await getStorefrontClient();
  const [{ data: cartData }, { data: headerData }] = await Promise.all([
    cartHandlers.get({ storefrontClient }),
    storefrontClient.graphql(HEADER_COLLECTIONS_QUERY),
  ]);
  const headerCollections = normalizeHeaderCollections(headerData?.collections?.nodes);

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <Script
          src="https://cdn.shopify.com/storefront/standard-actions.js"
          type="module"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-white text-black">
        <Providers cart={cartData.cart}>
          <Header collections={headerCollections} />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {children}
          <Footer />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
