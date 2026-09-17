import "server-only";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
} from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import { getBuyerIp } from "./buyer-ip";
import { i18n } from "./config";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Per-buyer private Storefront client (`hydrogen-storefront-client` /
 * `references/nextjs.md` dynamic-pages shape). Created inside `cache(async
 * () => …)` so it is request-scoped and deduped within one RSC request. Reads
 * `headers()` → dynamic render + per-buyer buyer IP. The locale is resolved from
 * the forwarded storefront URL (`x-storefront-url`, set by `proxy.ts`) against
 * the `i18n` definition.
 *
 * **Used only for the cart seed in the per-request AppShell** because the cart
 * is personalized. Catalog reads go through `getStaticStorefrontClient(locale)`
 * (`storefront-static.ts`) so they share a throttle bucket and never carry a
 * buyer IP (F2).
 */
export const getStorefrontClient = cache(
  async (): Promise<RequestScopedPrivateStorefrontClient<Record<string, unknown>>> => {
    const requestHeaders = await headers();
    const buyerIp = getBuyerIp(requestHeaders);
    const requestContext = createShopifyRequestContext({
      request: { headers: requestHeaders },
      i18n,
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
