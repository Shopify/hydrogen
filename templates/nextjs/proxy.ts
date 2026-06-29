import {
  createStorefrontClient,
  createStorefrontRequestContext,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

import { cartHandlers } from "./app/lib/cart-handlers";
import {
  DEVELOPMENT_BUYER_IP,
  getBuyerIp,
  getPrivateStorefrontToken,
  getStoreDomain,
  storefrontConfig,
  useMockShop,
} from "./app/lib/shop";

function getMockBuyerIp(headers: Pick<Headers, "get">): string {
  try {
    return getBuyerIp(headers);
  } catch {
    return DEVELOPMENT_BUYER_IP;
  }
}

export async function proxy(request: NextRequest) {
  const requestContext = createStorefrontRequestContext(request);
  const storefrontClient = createStorefrontClient({
    type: "private",
    config: useMockShop(process.env)
      ? {
          storeDomain: "mock.shop",
          i18n: storefrontConfig.i18n,
          privateStorefrontToken: "mock-shop",
          buyerIp: getMockBuyerIp(request.headers),
          requestContext,
          fetch: (_input, init) => fetch("https://mock.shop/api", init),
        }
      : {
          storeDomain: getStoreDomain(process.env),
          i18n: storefrontConfig.i18n,
          privateStorefrontToken: getPrivateStorefrontToken(),
          buyerIp: getBuyerIp(request.headers),
          requestContext,
        },
  });

  const shopifyRoute = await handleShopifyRoutes({
    request,
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
