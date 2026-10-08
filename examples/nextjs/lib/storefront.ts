import "server-only";
import { headers } from "next/headers";
import { cache } from "react";

import { getMarketFromHeaders } from "./markets";
import { createRequestStorefrontClient, type RequestStorefrontClient } from "./storefront-client";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Per-buyer Storefront client (`hydrogen-storefront-client` /
 * `references/nextjs.md` dynamic-pages shape). Created inside `cache(async
 * () => …)` so it is request-scoped and deduped within one RSC request. Reads
 * `headers()` → dynamic render + market, plus the per-buyer buyer IP against a
 * real store (tokenless public on mock.shop, where no buyer IP is needed).
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
    i18n: getMarketFromHeaders(requestHeaders),
  });
});
