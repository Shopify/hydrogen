import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n } from "@shared/config";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import { resolveStorefrontConfig } from "@shared/storefront-config";
import { handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createCartServerHandlers,
  createStorefrontClient,
  createShopifyRequestContext,
  type ShopifyRequestContextWithBuyerIp,
} from "@shopify/hydrogen";
import { createMiddleware } from "@solidjs/start/middleware";
import { LRUCache } from "lru-cache";

import {
  ACCOUNT_PATH,
  createCustomerSessionManager,
  createRequestCustomerAccountClient,
  customerSessionHandlers,
} from "./lib/customer-account";
import { routeTemplates } from "./lib/route-templates";

const PRIVATE_NO_STORE_CACHE_CONTROL = "private, no-store";

export const cartHandlers = createCartServerHandlers();
const storefrontCache = createStorefrontCacheAdapter(
  new LRUCache<string, object>({ max: STOREFRONT_CACHE_MAX_ENTRIES }),
);

// Hydrogen-owned and registered routes run pre-routing.
// Redirects are handled in `routes/[...404].tsx` so the SFAPI URL-redirects
// lookup only fires when the framework router has no match — same gate the
// other framework examples use, expressed as a route instead of a hook.

export default createMiddleware({
  onRequest: [
    async (event) => {
      const buyerIp = getBuyerIp(event.request.headers);
      const requestContext = createShopifyRequestContext({
        request: event.request,
        i18n: defaultI18n,
        buyerIp,
      });
      const storefrontClient = createRequestStorefrontClient(requestContext);
      const sessionManager = await createCustomerSessionManager(event.request);
      const customerAccountClient = createRequestCustomerAccountClient(requestContext);

      const shopifyRoute = handleShopifyRoutes({
        request: event.request,
        requestContext,
        sessionManager,
        storefrontClient,
        routeTemplates,
        handlers: [cartHandlers, customerSessionHandlers],
      });
      if (shopifyRoute) return shopifyRoute;

      event.locals.shopifyRequestContext = requestContext;
      event.locals.storefrontClient = storefrontClient;
      event.locals.customerSessionManager = sessionManager;
      event.locals.customerAccountClient = customerAccountClient;
    },
  ],
  onBeforeResponse: [
    (event) => {
      if (new URL(event.request.url).pathname === ACCOUNT_PATH) {
        event.response.headers.set("Cache-Control", PRIVATE_NO_STORE_CACHE_CONTROL);
      }

      event.locals.shopifyRequestContext?.applyResponseHeaders(event.response.headers);
    },
  ],
});

function createRequestStorefrontClient(requestContext: ShopifyRequestContextWithBuyerIp) {
  const config = resolveStorefrontConfig("hydrogen-example-solid-start");

  if (config.mode === "mock") {
    return createStorefrontClient({
      type: "public",
      requestContext,
      config: { storeDomain: config.storeDomain, cache: storefrontCache },
    });
  }

  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: config.storeDomain,
      privateStorefrontToken: config.privateStorefrontToken,
      cache: storefrontCache,
    },
  });
}
