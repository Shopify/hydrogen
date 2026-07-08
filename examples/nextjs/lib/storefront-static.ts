import "server-only";
import { createShopifyRequestContext, createStorefrontClient } from "@shopify/hydrogen";

import { DEFAULT_MARKET } from "./markets";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Shared-rate-limit private Storefront client for **all catalog reads**
 * (`hydrogen-storefront-client` / `references/nextjs.md` static-pages shape +
 * engineering.md F2). Module-scoped: one client for the process, no `headers()`
 * → no buyer IP, shared throttle bucket. Single-market example → `DEFAULT_MARKET`.
 *
 * Catalog pages (home, collections index, collection PLP, product, search,
 * sitemap, related products, shop analytics GID) fetch through this client.
 * Only the cart seed uses the per-buyer `getStorefrontClient()`.
 *
 * Caching lives at the `use cache` boundary (cache-points keyed by serializable
 * inputs). The `cache:` option is never passed to `graphql()` — Next native
 * data cache + `cacheLife`/`cacheTag` replace the Oxygen sub-request LRU.
 */
const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n: DEFAULT_MARKET,
});

const { storeDomain, privateStorefrontToken } = resolveStorefrontConfig();

export const staticStorefrontClient = createStorefrontClient({
  type: "private_no_buyer_context",
  requestContext,
  config: {
    storeDomain,
    privateStorefrontToken,
  },
});
