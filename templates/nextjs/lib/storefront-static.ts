import "server-only";
import { i18n } from "./config";
import { createStaticStorefrontClient } from "./storefront-client";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Shared-rate-limit Storefront client for **all catalog reads**.
 * Module-scoped: one client for the process, no `headers()`
 * → no buyer IP, shared throttle bucket, and no request URL to resolve a locale
 * from, so the default locale is pinned explicitly.
 * Private (no buyer context) against a real store; tokenless public on mock.shop.
 *
 * Catalog pages (home, collections index, collection PLP, product, search,
 * sitemap, related products, shop analytics GID) fetch through this client.
 * Only the cart seed uses the per-buyer `getStorefrontClient()`.
 *
 * Caching lives at the `use cache` boundary (cache-points keyed by serializable
 * inputs). The `cache:` option is never passed to `graphql()` — Next native
 * data cache + `cacheLife`/`cacheTag` replace the Oxygen sub-request LRU.
 */
export const staticStorefrontClient = createStaticStorefrontClient({
  config: resolveStorefrontConfig(),
  request: { headers: new Headers() },
  i18n,
  locale: i18n.defaultLocale,
});
