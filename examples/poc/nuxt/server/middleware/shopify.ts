import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n } from "@shared/config";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import { resolveStorefrontConfig } from "@shared/storefront-config";
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
  const buyerIp = getBuyerIp(request.headers);
  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
    buyerIp,
  });
  const storefrontClient = createPrivateStorefrontClient(requestContext, buyerIp);
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

function createPrivateStorefrontClient(requestContext: ShopifyRequestContext, buyerIp: string) {
  const { storeDomain, privateStorefrontToken } = resolveStorefrontConfig("hydrogen-example-nuxt");

  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain,
      privateStorefrontToken,
      buyerIp,
      cache: storefrontCache,
    },
  });
}
