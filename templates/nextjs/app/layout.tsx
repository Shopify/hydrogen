import { gql } from "@shopify/hydrogen";
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { CartDrawer } from "./components/CartDrawer";
import { ConsentBanner } from "./components/ConsentBanner";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Providers } from "./components/Providers";
import { cartHandlers } from "./lib/cart-handlers";
import { analyticsConsent, analyticsShop } from "./lib/shop";
import { getStorefrontClient } from "./lib/storefront";

import "./globals.css";

export const metadata: Metadata = {
  title: "CORE Storefront",
  description: "A Storefront Kit example built with Next.js.",
};

const NAV_COLLECTIONS_QUERY = gql(`
  query NavCollections {
    collections(first: 5) {
      nodes {
        handle
        title
      }
    }
  }
`);

const FALLBACK_COLLECTIONS = [{ handle: "men", title: "Men" }];

export default async function RootLayout({ children }: { children: ReactNode }) {
  const storefrontClient = await getStorefrontClient();
  const [{ data: cartData }, navResult] = await Promise.all([
    cartHandlers.get({ storefrontClient }),
    storefrontClient.graphql(NAV_COLLECTIONS_QUERY),
  ]);
  const navCollections = navResult.data?.collections.nodes.length
    ? navResult.data.collections.nodes
    : FALLBACK_COLLECTIONS;

  return (
    <html lang="en">
      <head>
        <Script
          type="module"
          src="https://cdn.shopify.com/storefront/standard-actions.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        <a
          href="#main-content"
          className="focus-visible:bg-interactive focus-visible:text-interactive-text sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded focus-visible:px-4 focus-visible:py-2"
        >
          Skip to content
        </a>
        <div
          role="region"
          aria-label="Announcement"
          className="bg-on-surface px-margin py-2.5 text-center"
        >
          <p className="type-body-sm text-surface">Free shipping on orders over $50</p>
        </div>
        <Providers
          cart={cartData.cart ?? undefined}
          analyticsShop={analyticsShop}
          analyticsConsent={analyticsConsent}
          enableTestTap={process.env.MOCK_SHOP === "1"}
        >
          <Header collections={navCollections} />
          {children}
          <Footer />
          <CartDrawer />
          <ConsentBanner forceShow={process.env.MOCK_SHOP === "1"} />
        </Providers>
      </body>
    </html>
  );
}
