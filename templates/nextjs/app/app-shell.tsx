import "server-only";
import { connection } from "next/server";
import { Suspense } from "react";

import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HeaderAccountLink, HeaderAccountLinkFallback } from "@/components/HeaderAccountLink";
import { getAnalyticsShop } from "@/lib/analytics-shop";
import { cartHandlers } from "@/lib/cart-handlers";
import { getStorefrontClient } from "@/lib/storefront";

import { Providers } from "./providers";

/**
 * Async server shell that owns the per-request (dynamic) reads: the cart seed
 * + the shop analytics GID. With `cacheComponents: true`, uncached/dynamic data
 * accessed in a Server Component must sit inside a `<Suspense>` boundary so the
 * static HTML shell prerenders and the per-buyer parts stream
 * (`next/server` `connection()` + `headers()`/`cookies()` are per-request).
 *
 * Rendered inside `<Suspense>` from the root layout. `await connection()`
 * opts the subtree into dynamic rendering (resolves immediately on a real
 * request, never during prerender).
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  await connection();

  // Cart seed: per-buyer and non-blocking so the shell can stream.
  const cartData = getStorefrontClient().then((storefrontClient) =>
    cartHandlers.get({ storefrontClient }).then((r) => r.data),
  );
  const analyticsShop = await getAnalyticsShop();

  return (
    <Providers cartData={cartData}>
      <a
        href="#main-content"
        className="focus-visible:bg-interactive focus-visible:text-interactive-text sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded focus-visible:px-4 focus-visible:py-2"
      >
        Skip to content
      </a>

      <Header
        accountLink={
          <Suspense fallback={<HeaderAccountLinkFallback />}>
            <HeaderAccountLink />
          </Suspense>
        }
        shopName={analyticsShop.shopName}
      />

      <main className="flex-1" id="main-content" tabIndex={-1}>
        {children}
      </main>

      <Footer shopName={analyticsShop.shopName} />

      <CartDrawer />
    </Providers>
  );
}
