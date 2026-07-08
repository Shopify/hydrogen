import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n, storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import { handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createStorefrontClient,
  createShopifyRequestContext,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import { LRUCache } from "lru-cache";

import { cartHandlers } from "../../storefront/cart-handlers";
import {
  createRequestCustomerAccountClient,
  createCustomerSessionManager,
  customerSessionHandlers,
} from "../../storefront/customer-account";
import { predictiveSearchHandlers } from "../../storefront/predictive-search-handlers";

const storefrontCache = createStorefrontCacheAdapter(
  new LRUCache<string, object>({ max: STOREFRONT_CACHE_MAX_ENTRIES }),
);

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
  });
  const storefrontClient = createPrivateStorefrontClient(request, requestContext);
  const sessionManager = await createCustomerSessionManager(request);
  const customerAccountClient = createRequestCustomerAccountClient(requestContext);

  const shopifyRoute = await handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    handlers: [cartHandlers, predictiveSearchHandlers, customerSessionHandlers],
  });
  if (shopifyRoute) {
    return sendWebResponse(event, shopifyRoute);
  }

  event.context.shopifyRequestContext = requestContext;
  event.context.storefrontClient = storefrontClient;
  event.context.customerSessionManager = sessionManager;
  event.context.customerAccountClient = customerAccountClient;
});

function createPrivateStorefrontClient(request: Request, requestContext: ShopifyRequestContext) {
  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: storefrontConfig.storeDomain,
      privateStorefrontToken: getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(request.headers),
      cache: storefrontCache,
    },
  });
}
