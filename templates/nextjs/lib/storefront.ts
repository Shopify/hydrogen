import "server-only";
import { headers } from "next/headers";
import { cache } from "react";

import { i18n } from "./config";
import { createRequestStorefrontClient, type RequestStorefrontClient } from "./storefront-client";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Per-buyer Storefront client (`hydrogen-storefront-client` /
 * `references/nextjs.md` dynamic-pages shape). Created inside `cache(async
 * () => …)` so it is request-scoped and deduped within one RSC request. Reads
 * `headers()` → dynamic render, plus the per-buyer buyer IP against a real
 * store (tokenless public on mock.shop, where no buyer IP is needed). The locale
 * is resolved from the forwarded storefront URL (`x-storefront-url`, set by
 * `proxy.ts`) against the `i18n` definition.
 *
 * **Used only for the cart seed in the per-request AppShell** because the cart
 * is personalized. Catalog reads go through `staticStorefrontClient`
 * (`storefront-static.ts`) so they share a throttle bucket and never carry a
 * buyer IP (F2).
 */
export const getStorefrontClient = cache(async (): Promise<RequestStorefrontClient> => {
  const requestHeaders = await headers();

  return createRequestStorefrontClient({
    config: resolveStorefrontConfig(),
    request: { headers: requestHeaders },
    i18n,
  });
});
