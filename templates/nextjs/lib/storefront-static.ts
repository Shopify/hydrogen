import "server-only";
import { getLocalePathSegment, type ShopifyLocale } from "@shopify/hydrogen";

import { i18n } from "./config";
import { createStaticStorefrontClient, type StaticStorefrontClient } from "./storefront-client";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Shared-rate-limit Storefront client for **all catalog reads**, one per
 * locale. Module-scoped: no `headers()` → no buyer IP, shared throttle bucket,
 * and no request URL to resolve a locale from, so the caller pins the locale it
 * resolved from the `[locale]` route param. That keeps every catalog page
 * prerenderable: the locale is part of the URL, never read from the request.
 * Private (no buyer context) against a real store; tokenless public on mock.shop.
 *
 * Catalog pages (home, collections index, collection PLP, product, search,
 * sitemap, related products, shop analytics GID) fetch through this client.
 * Only the cart seed uses the per-buyer `getStorefrontClient()`.
 *
 * Caching lives at the `use cache` boundary (cache-points keyed by serializable
 * inputs, which is why pages pass the plain `locale` object in). The `cache:`
 * option is never passed to `graphql()` — Next native data cache +
 * `cacheLife`/`cacheTag` replace the Oxygen sub-request LRU.
 */
export function getStaticStorefrontClient(
  locale: ShopifyLocale = i18n.defaultLocale,
): StaticStorefrontClient {
  const key = getLocalePathSegment(locale);
  let client = clients.get(key);
  if (!client) {
    client = createStaticStorefrontClient({
      config: resolveStorefrontConfig(),
      request: { headers: new Headers() },
      i18n,
      locale,
    });
    clients.set(key, client);
  }
  return client;
}

const clients = new Map<string, StaticStorefrontClient>();
