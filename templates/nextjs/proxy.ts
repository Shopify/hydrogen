import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

import { cartHandlers } from "./app/lib/cart-handlers";
import { createRequestSessionManager } from "./app/lib/session";
import {
  DEVELOPMENT_BUYER_IP,
  getBuyerIp,
  getPrivateStorefrontToken,
  getStoreDomain,
  storefrontConfig,
  shouldUseMockShop,
} from "./app/lib/shop";

function getMockBuyerIp(headers: Pick<Headers, "get">): string {
  try {
    return getBuyerIp(headers);
  } catch {
    return DEVELOPMENT_BUYER_IP;
  }
}

export async function proxy(request: NextRequest) {
  const usingMockShop = shouldUseMockShop(process.env);
  const buyerIp = usingMockShop ? getMockBuyerIp(request.headers) : getBuyerIp(request.headers);
  const requestContext = createShopifyRequestContext({
    request,
    i18n: storefrontConfig.i18n,
    buyerIp,
  });
  const storeDomain = usingMockShop ? "mock.shop" : getStoreDomain(process.env);
  const privateStorefrontToken = usingMockShop ? "mock-private-token" : getPrivateStorefrontToken();
  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain,
      privateStorefrontToken,
      buyerIp,
    },
  });

  const shopifyRoute = await handleShopifyRoutes({
    request,
    requestContext,
    sessionManager: createRequestSessionManager(request),
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  const requestHeaders = requestContext.getForwardedRequestHeaders();
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  requestContext.applyResponseHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
