import { getBuyerIp } from "@shared/buyer-ip";
import { createExampleStorefrontClient } from "@shared/storefront-client";
import {
  createStorefrontClient,
  createStorefrontRequestContext,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

import { cartHandlers } from "@/lib/cart-handlers";

export async function proxy(request: NextRequest) {
  const requestContext = createStorefrontRequestContext(request);
  const storefrontClient = createExampleStorefrontClient(createStorefrontClient, {
    requestContext,
    buyerIp: getBuyerIp(request.headers),
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
