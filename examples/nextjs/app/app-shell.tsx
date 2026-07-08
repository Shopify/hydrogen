import "server-only";
import { analyticsConsent as analyticsConsentConfig } from "@shared/config";
import { connection } from "next/server";
import { Suspense } from "react";

import { CartDrawer } from "@/components/CartDrawer";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HeaderAccountLink, HeaderAccountLinkFallback } from "@/components/HeaderAccountLink";
import { ShopifyScriptsClient } from "@/components/ShopifyScriptsClient";
import { getAnalyticsShop, getScriptsShop } from "@/lib/analytics-shop";
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

  // Cart seed: per-buyer `getStorefrontClient()` (skill-mandated; the cart is
  // personalized). Non-blocking via `Promise.race` (F1). On success pass the
  // full `{cart, errors?}` envelope; on timeout/error pass `undefined` so the
  // client fetches `/api/cart` after hydration (NOT `{cart:null}` — that would
  // suppress the retry).
  const storefrontClient = await getStorefrontClient();
  let cartData: Awaited<ReturnType<typeof cartHandlers.get>>["data"] | undefined;
  try {
    const result = await Promise.race([
      cartHandlers.get({ storefrontClient }),
      timeoutReject(2000),
    ]);
    cartData = result.data;
  } catch (error) {
    console.error("[hydrogen] Cart seed failed or timed out", error);
    cartData = undefined;
  }

  // Analytics shop GID: best-effort, non-blocking (F1). Merged with
  // `@shared/config` metadata (acceptedLanguage/currency/hydrogenSubchannelId).
  const analyticsShop = await getAnalyticsShop();
  const scriptsShop = getScriptsShop();

  return (
    <Providers
      cartData={cartData}
      analyticsShop={analyticsShop}
      analyticsConsent={analyticsConsentConfig}
    >
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
      />

      <main className="flex-1" id="main-content" tabIndex={-1}>
        {children}
      </main>

      <Footer />

      <CartDrawer />
      <ConsentBanner />

      <ShopifyScriptsClient shop={scriptsShop} />
    </Providers>
  );
}

function timeoutReject(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`cart seed timed out after ${ms}ms`)), ms);
  });
}
