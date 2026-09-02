import "server-only";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
} from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import { getBuyerIp } from "./buyer-ip";
import { getMarketFromHeaders } from "./markets";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Per-buyer private Storefront client (`hydrogen-storefront-client` /
 * `references/nextjs.md` dynamic-pages shape). Created inside `cache(async
 * () => …)` so it is request-scoped and deduped within one RSC request. Reads
 * `headers()` → dynamic render + per-buyer buyer IP + market.
 *
 * **Used only for the cart seed in the per-request AppShell** because the cart
 * is personalized. Catalog reads go through `staticStorefrontClient`
 * (`storefront-static.ts`) so they share a throttle bucket and never carry a
 * buyer IP (F2).
 */
export const getStorefrontClient = cache(
  async (): Promise<RequestScopedPrivateStorefrontClient<Record<string, unknown>>> => {
    const requestHeaders = await headers();
    const buyerIp = getBuyerIp(requestHeaders);
    const requestContext = createShopifyRequestContext({
      request: { headers: requestHeaders },
      i18n: getMarketFromHeaders(requestHeaders),
      buyerIp,
    });

    const { storeDomain, privateStorefrontToken, storefrontId } = resolveStorefrontConfig();

    return createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain,
        privateStorefrontToken,
        storefrontId,
      },
    });
  },
);
