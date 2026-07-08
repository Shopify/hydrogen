import "server-only";
import { getBuyerIp } from "@shared/buyer-ip";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
} from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import { getMarketFromHeaders } from "./markets";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Per-buyer private Storefront client (`hydrogen-storefront-client` /
 * `references/nextjs.md` dynamic-pages shape). Created inside `cache(async
 * () => …)` so it is request-scoped and deduped within one RSC request. Reads
 * `headers()` → dynamic render + per-buyer buyer IP + market.
 *
 * **Used only for the cart seed in the root layout** (skill-mandated; the cart
 * is personalized). Catalog reads go through `staticStorefrontClient`
 * (`storefront-static.ts`) so they share a throttle bucket and never carry a
 * buyer IP (F2).
 */
export const getStorefrontClient = cache(
  async (): Promise<RequestScopedPrivateStorefrontClient<{}>> => {
    const requestHeaders = await headers();
    const requestContext = createShopifyRequestContext({
      request: { headers: requestHeaders },
      i18n: getMarketFromHeaders(requestHeaders),
    });

    const { storeDomain, privateStorefrontToken } = resolveStorefrontConfig();
    const buyerIp = getBuyerIp(requestHeaders);

    return createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain,
        privateStorefrontToken,
        buyerIp,
      },
    });
  },
);
