import "server-only";
import { createShopifyRequestContext, createStorefrontClient } from "@shopify/hydrogen";

import { i18n } from "./config";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Shared-rate-limit private Storefront client for **all catalog reads**.
 * Module-scoped: one client for the process, no `headers()`
 * → no buyer IP, shared throttle bucket, and no request URL to resolve a locale
 * from, so the default locale is pinned explicitly.
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
  i18n,
  locale: i18n.defaultLocale,
});

const { storeDomain, privateStorefrontToken, storefrontId } = resolveStorefrontConfig();

export const staticStorefrontClient = createStorefrontClient({
  type: "private_no_buyer_context",
  requestContext,
  config: {
    storeDomain,
    privateStorefrontToken,
    storefrontId,
  },
});
