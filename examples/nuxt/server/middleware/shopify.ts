import { getBuyerIp } from "@shared/buyer-ip";
import { createExampleStorefrontClient } from "@shared/storefront-client";
import { handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createStorefrontRequestContext,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";

import { cartHandlers } from "../../storefront/cart-handlers";

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const requestContext = createStorefrontRequestContext(request);
  const storefrontClient = createPrivateStorefrontClient(request, requestContext);

  const shopifyRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) {
    return sendWebResponse(event, shopifyRoute);
  }

  event.context.storefrontRequestContext = requestContext;
  event.context.storefrontClient = storefrontClient;
});

function createPrivateStorefrontClient(request: Request, requestContext: StorefrontRequestContext) {
  return createExampleStorefrontClient({
    requestContext,
    buyerIp: getBuyerIp(request.headers),
  });
}
