import "server-only";
import { createStorefrontClient, createStorefrontRequestContext } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import {
  DEVELOPMENT_BUYER_IP,
  getBuyerIp,
  getPrivateStorefrontToken,
  getStoreDomain,
  storefrontConfig,
  useMockShop,
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
  const requestContext = createStorefrontRequestContext({ headers: requestHeaders });

  return createStorefrontClient({
    type: "private",
    config: useMockShop(process.env)
      ? {
          storeDomain: "mock.shop",
          i18n: storefrontConfig.i18n,
          privateStorefrontToken: "mock-shop",
          buyerIp: getRequestBuyerIp(requestHeaders),
          requestContext,
          fetch: (_input, init) => fetch("https://mock.shop/api", init),
        }
      : {
          storeDomain: getStoreDomain(process.env),
          i18n: storefrontConfig.i18n,
          privateStorefrontToken: getPrivateStorefrontToken(),
          buyerIp: getBuyerIp(requestHeaders),
          requestContext,
        },
  });
});
