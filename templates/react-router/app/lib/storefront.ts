import {
  type CacheInstance,
  createStorefrontClient,
  type PublicStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
  type ShopifyRequestContext,
  type ShopifyRequestContextWithBuyerIp,
} from "@shopify/hydrogen";
import { createContext } from "react-router";

import type { Env } from "~/lib/env";
import {
  getMockShopDomain,
  getPrivateStorefrontToken,
  getStoreDomain,
  shouldUseMockShop,
} from "~/lib/shop";

// Real store: private token + trusted buyer IP. mock.shop: tokenless public
// access (it is auth-free and rejects any private token, even a placeholder).
export type RequestStorefrontClient = RequestScopedPrivateStorefrontClient | PublicStorefrontClient;

export function createRequestStorefrontClient(
  requestContext: ShopifyRequestContextWithBuyerIp,
  env: Env,
  cache: CacheInstance,
  waitUntil: ExecutionContext["waitUntil"],
): RequestStorefrontClient {
  if (shouldUseMockShop(env)) {
    return createStorefrontClient({
      type: "public",
      requestContext,
      config: {
        storeDomain: getMockShopDomain(env),
        cache,
        waitUntil,
      },
    });
  }

  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: getStoreDomain(env),
      privateStorefrontToken: getPrivateStorefrontToken(env),
      storefrontId: env.PUBLIC_STOREFRONT_ID,
      cache,
      waitUntil,
    },
  });
}

export const storefrontClientContext = createContext<RequestStorefrontClient>();
export const storefrontRequestContext = createContext<ShopifyRequestContext | null>(null);
