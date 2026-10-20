import "server-only";
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
 * Async server shell for the header, footer, cart drawer, and cart provider.
 * It awaits only the cached shop identity. The per-buyer cart seed stays an
 * un-awaited promise, so the shell does not block on it. Consumers that need
 * the full cart suspend locally. Do not put this private seed in `use cache`.
 *
 * Rendered directly from the root layout, without a `<Suspense>` boundary.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
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
