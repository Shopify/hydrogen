import { getShopifyCspDirectives } from "@shopify/hydrogen";

import { storefrontConfig } from "./config.ts";
import { MOCK_SHOP_DOMAIN } from "./storefront-mode.ts";

type ShopifyCspDirectives = ReturnType<typeof getShopifyCspDirectives>;

// The resolver also accepts mock.shop subdomains such as `pets.mock.shop`.
const MOCK_SHOP_ORIGINS = [`https://${MOCK_SHOP_DOMAIN}`, `https://*.${MOCK_SHOP_DOMAIN}`];

/**
 * Shopify CSP directives that allow both the shared private store and mock.shop. Frameworks that
 * fix their CSP in config can't know which mode a request will resolve to, so they allow both.
 * Only `connectSrc` and `frameSrc` depend on the store domain.
 */
export function getExampleShopifyCspDirectives(
  options?: Parameters<typeof getShopifyCspDirectives>[1],
): ShopifyCspDirectives {
  const directives = getShopifyCspDirectives(
    { storeDomain: storefrontConfig.storeDomain },
    options,
  );

  return {
    ...directives,
    connectSrc: union(directives.connectSrc, MOCK_SHOP_ORIGINS),
    frameSrc: union(directives.frameSrc, MOCK_SHOP_ORIGINS),
  } satisfies ShopifyCspDirectives;
}

function union(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])];
}
