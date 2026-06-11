import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import { handleShopifyRoutes } from "@shopify/hydrogen";
import { createStorefrontClient, createStorefrontRequestContext } from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

import { cartHandlers } from "./app/lib/cart-handlers";

export async function proxy(request: NextRequest) {
  const requestContext = createStorefrontRequestContext(request);
  const storefrontClient = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      privateStorefrontToken: getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(request.headers),
      requestContext,
    },
  });

  const kitRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (kitRoute) return kitRoute;

  const requestHeaders = requestContext.getForwardedRequestHeaders();
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  requestContext.applyResponseHeaders(response.headers);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
