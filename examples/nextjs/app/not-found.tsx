import { handleShopifyRedirects } from "@shopify/hydrogen";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { routeTemplates } from "@/lib/route-templates";
import { getStorefrontClient } from "@/lib/storefront";

/**
 * Next.js 404 + Shopify URL redirects (`hydrogen-request-handlers` /
 * `references/nextjs.md`). `proxy.ts` cannot inspect the routed response, so
 * Storefront URL redirects run here, after the framework returns a 404.
 *
 * With `cacheComponents: true`, the per-request reads (`headers()` +
 * `getStorefrontClient()` + `redirect()`) must sit inside a `<Suspense>`
 * boundary. The static 404 shell prerenders; the `<RedirectChecker>` streams
 * and either `redirect()`s to a matching Shopify URL redirect or renders
 * nothing (leaving the 404 shell visible).
 *
 * The forwarded `x-storefront-url` header (set by `proxy.ts`) carries the
 * original URL so `handleShopifyRedirects` can match it.
 *
 * Gotcha (N2): Next's `redirect()` does not preserve Hydrogen's `301` status.
 */
export default function NotFound() {
  return (
    <main className="max-w-page px-margin mx-auto w-full py-16 text-center">
      <Suspense fallback={null}>
        <RedirectChecker />
      </Suspense>
      <h1 className="type-display mb-4">Page not found</h1>
      <p className="type-body text-on-surface-secondary mb-8">
        The page you’re looking for doesn’t exist.
      </p>
      <Link
        href="/"
        className="rounded-button button-primary inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline"
      >
        Back to home
      </Link>
    </main>
  );
}

async function RedirectChecker() {
  await connection();
  const requestHeaders = await headers();
  const url = requestHeaders.get("x-storefront-url");

  if (url) {
    const result = await handleShopifyRedirects({
      request: new Request(url),
      storefrontClient: await getStorefrontClient(),
      routeTemplates,
    });
    const location = result?.headers.get("location");
    if (location) redirect(location);
  }

  return null;
}
