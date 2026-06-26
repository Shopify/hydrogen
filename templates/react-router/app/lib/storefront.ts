import {
  createStorefrontClient,
  createStorefrontRequestContext,
  type RequestScopedPrivateStorefrontClient,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";
import { createContext } from "react-router";

import {
  DEVELOPMENT_BUYER_IP,
  getBuyerIp,
  getPrivateStorefrontToken,
  storefrontConfig,
} from "~/lib/shop";
import type { Env } from "~/lib/env";

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
): RequestScopedPrivateStorefrontClient {
  const requestContext = createStorefrontRequestContext(request);

  if (env.MOCK_SHOP === "1") {
    return createStorefrontClient({
      type: "private",
      config: {
        storeDomain: "mock.shop",
        i18n: storefrontConfig.i18n,
        privateStorefrontToken: "mock-shop",
        buyerIp: getMockBuyerIp(request.headers),
        requestContext,
        fetch: (_input, init) => fetch("https://mock.shop/api", init),
      },
    });
  }

  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      privateStorefrontToken: getPrivateStorefrontToken(env),
      buyerIp: getBuyerIp(request.headers),
      requestContext,
    },
  });
}

export const storefrontClientContext = createContext<RequestScopedPrivateStorefrontClient>();
export const storefrontRequestContext = createContext<StorefrontRequestContext>();
