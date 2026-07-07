import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n, storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import { handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createCartServerHandlers,
  createStorefrontClient,
  createShopifyRequestContext,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import { createMiddleware } from "@solidjs/start/middleware";
import { LRUCache } from "lru-cache";

import {
  ACCOUNT_PATH,
  createCustomerSessionManager,
  createRequestCustomerAccountClient,
  customerSessionHandlers,
} from "./lib/customer-account";

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
      const requestContext = createShopifyRequestContext({
        request: event.request,
        i18n: defaultI18n,
      });
      const storefrontClient = createPrivateStorefrontClient(event.request, requestContext);
      const sessionManager = await createCustomerSessionManager(event.request);
      const customerAccountClient = createRequestCustomerAccountClient(requestContext);

      const kitRoute = await handleShopifyRoutes({
        request: event.request,
        requestContext,
        sessionManager,
        storefrontClient,
        handlers: [cartHandlers, customerSessionHandlers],
      });
      if (kitRoute) return kitRoute;

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
