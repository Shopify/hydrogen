import { getShopifyCspDirectives } from "@shopify/hydrogen";

import { storefrontConfig } from "./config.ts";
import { MOCK_SHOP_DOMAIN } from "./storefront-mode.ts";

type ShopifyCspDirectives = ReturnType<typeof getShopifyCspDirectives>;

/**
 * Shopify CSP directives that allow both the shared private store and mock.shop. Frameworks that
 * fix their CSP in config can't know which mode a request will resolve to, so they allow both.
 */
export function getExampleShopifyCspDirectives(
  options?: Parameters<typeof getShopifyCspDirectives>[1],
): ShopifyCspDirectives {
  const privateStore = getShopifyCspDirectives(
    { storeDomain: storefrontConfig.storeDomain },
    options,
  );
  const mockShop = getShopifyCspDirectives({ storeDomain: MOCK_SHOP_DOMAIN }, options);

  return Object.fromEntries(
    Object.entries(privateStore).map(([name, sources]) => [
      name,
      [...new Set([...sources, ...mockShop[name as keyof ShopifyCspDirectives]])],
    ]),
  ) as ShopifyCspDirectives;
}
