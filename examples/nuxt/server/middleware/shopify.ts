import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import { handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createStorefrontClient,
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
  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      privateStorefrontToken: getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(request.headers),
      requestContext,
    },
  });
}
