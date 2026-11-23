import {
  createShopifyRequestContext,
  createStorefrontClient,
  type CacheInstance,
  type PublicStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";

import { getBuyerIp } from "./buyer-ip.ts";
import { i18n } from "./config.ts";
import type { StorefrontMode } from "./storefront-mode.ts";

export type ModeStorefrontClient = PublicStorefrontClient | RequestScopedPrivateStorefrontClient;

let warnedAboutMockShop = false;

export function createModeStorefrontClient({
  storefront,
  request,
  cache,
}: {
  storefront: StorefrontMode;
  request: Request;
  cache?: CacheInstance;
}): { requestContext: ShopifyRequestContext; storefrontClient: ModeStorefrontClient } {
  if (storefront.mode === "mock") {
    warnAboutMockShop(storefront.storeDomain);
    const requestContext = createShopifyRequestContext({ request, i18n });
    const storefrontClient = createStorefrontClient({
      type: "public",
      requestContext,
      config: { storeDomain: storefront.storeDomain, cache },
    });
    return { requestContext, storefrontClient };
  }

  const requestContext = createShopifyRequestContext({
    request,
    i18n,
    buyerIp: getBuyerIp(request.headers),
  });
  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: storefront.storeDomain,
      privateStorefrontToken: storefront.privateStorefrontToken,
      cache,
    },
  });
  return { requestContext, storefrontClient };
}

function warnAboutMockShop(storeDomain: string) {
  if (warnedAboutMockShop) return;
  warnedAboutMockShop = true;
  console.warn(
    `[hydrogen example] Using ${storeDomain} with Customer Accounts and Shopify analytics off, ` +
      `because PRIVATE_STOREFRONT_API_TOKEN is missing, MOCK_SHOP=1, or PUBLIC_STORE_DOMAIN is a mock.shop domain. ` +
      `Run "pnpm run examples:secrets:decrypt" to use the shared private store.`,
  );
}
