import "server-only";
import { createShopifyRequestContext, createStorefrontClient } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import {
  DEVELOPMENT_BUYER_IP,
  getBuyerIp,
  getPrivateStorefrontToken,
  getStoreDomain,
  storefrontConfig,
  shouldUseMockShop,
} from "./shop";

function getRequestBuyerIp(requestHeaders: Headers): string {
  try {
    return getBuyerIp(requestHeaders);
  } catch {
    return DEVELOPMENT_BUYER_IP;
  }
}

export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const usingMockShop = shouldUseMockShop(process.env);
  const buyerIp = usingMockShop ? getRequestBuyerIp(requestHeaders) : getBuyerIp(requestHeaders);
  const requestContext = createShopifyRequestContext({
    request: { headers: requestHeaders },
    i18n: storefrontConfig.i18n,
    buyerIp,
  });
  const storeDomain = usingMockShop ? "mock.shop" : getStoreDomain(process.env);
  const privateStorefrontToken = usingMockShop ? "mock-private-token" : getPrivateStorefrontToken();

  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain,
      privateStorefrontToken,
      buyerIp,
    },
  });
});
