import "server-only";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  getLocalePathSegment,
  type ShopifyLocale,
} from "@shopify/hydrogen";

import { i18n } from "./config";
import { resolveStorefrontConfig } from "./storefront-config";

/**
 * Shared-rate-limit private Storefront client for **all catalog reads**, one
 * per locale. Module-scoped: no `headers()` → no buyer IP, shared throttle
 * bucket, and no request URL to resolve a locale from, so the caller pins the
 * locale it resolved from the `[locale]` route param. That keeps every catalog
 * page prerenderable: the locale is part of the URL, never read from the request.
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
export function getStaticStorefrontClient(locale: ShopifyLocale = i18n.defaultLocale) {
  const key = getLocalePathSegment(locale);
  let client = clients.get(key);
  if (!client) {
    client = createClient(locale);
    clients.set(key, client);
  }
  return client;
}

const clients = new Map<string, ReturnType<typeof createClient>>();

function createClient(locale: ShopifyLocale) {
  const requestContext = createShopifyRequestContext({
    request: { headers: new Headers() },
    i18n,
    locale,
  });

  const { storeDomain, privateStorefrontToken, storefrontId } = resolveStorefrontConfig();

  return createStorefrontClient({
    type: "private_no_buyer_context",
    requestContext,
    config: {
      storeDomain,
      privateStorefrontToken,
      storefrontId,
    },
  });
}
