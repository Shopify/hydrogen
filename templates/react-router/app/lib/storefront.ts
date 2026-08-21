import {
  type CacheInstance,
  createShopifyRequestContext,
  createStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import { createContext } from "react-router";

import type { Env } from "~/lib/env";
import {
  DEVELOPMENT_BUYER_IP,
  getBuyerIp,
  getPrivateStorefrontToken,
  getStoreDomain,
  storefrontConfig,
  shouldUseMockShop,
} from "~/lib/shop";

function getMockBuyerIp(headers: Pick<Headers, "get">): string {
  try {
    return getBuyerIp(headers);
  } catch {
    return DEVELOPMENT_BUYER_IP;
  }
}

export function createRequestStorefrontClient(
  request: Request,
  env: Env,
  cache: CacheInstance,
  waitUntil: ExecutionContext["waitUntil"],
): RequestScopedPrivateStorefrontClient {
  const usingMockShop = shouldUseMockShop(env);
  const buyerIp = usingMockShop ? getMockBuyerIp(request.headers) : getBuyerIp(request.headers);
  const requestContext = createShopifyRequestContext({
    request,
    i18n: storefrontConfig.i18n,
    buyerIp,
  });

  const storeDomain = usingMockShop ? "mock.shop" : getStoreDomain(env);
  const privateStorefrontToken = usingMockShop
    ? "mock-private-token"
    : getPrivateStorefrontToken(env);

  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain,
      privateStorefrontToken,
      storefrontId: usingMockShop ? undefined : env.PUBLIC_STOREFRONT_ID,
      cache,
      waitUntil,
    },
  });
}

export const storefrontClientContext = createContext<RequestScopedPrivateStorefrontClient>();
export const storefrontRequestContext = createContext<ShopifyRequestContext>();
