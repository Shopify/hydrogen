import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n, storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import { handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createStorefrontClient,
  createShopifyRequestContext,
  type ShopifyRequestContextWithBuyerIp,
} from "@shopify/hydrogen";

import { cartHandlers } from "../../storefront/cart-handlers";
import {
  createRequestCustomerAccountClient,
  createCustomerSessionManager,
  customerSessionHandlers,
} from "../../storefront/customer-account";
import { predictiveSearchHandlers } from "../../storefront/predictive-search-handlers";

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const buyerIp = getBuyerIp(request.headers);
  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
    buyerIp,
  });
  const storefrontClient = createPrivateStorefrontClient(requestContext);
  const sessionManager = await createCustomerSessionManager(request);
  const customerAccountClient = createRequestCustomerAccountClient(requestContext);

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    handlers: [cartHandlers, predictiveSearchHandlers, customerSessionHandlers],
  });
  if (shopifyRoute) {
    return sendWebResponse(event, await shopifyRoute);
  }

  event.context.shopifyRequestContext = requestContext;
  event.context.storefrontClient = storefrontClient;
  event.context.customerSessionManager = sessionManager;
  event.context.customerAccountClient = customerAccountClient;
});

function createPrivateStorefrontClient(requestContext: ShopifyRequestContextWithBuyerIp) {
  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: storefrontConfig.storeDomain,
      privateStorefrontToken: getPrivateStorefrontToken(),
    },
  });
}
