import { getRuntimeEnv } from "@shared/private-env";
import { createRequestSessionManager } from "@shared/request-session";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import { createModeStorefrontClient } from "@shared/storefront-client";
import { resolveStorefrontMode } from "@shared/storefront-mode";
import { createCartServerHandlers, handleShopifyRoutes } from "@shopify/hydrogen";
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
      const storefront = resolveStorefrontMode(getRuntimeEnv());
      const { requestContext, storefrontClient } = createModeStorefrontClient({
        storefront,
        request: event.request,
        cache: storefrontCache,
      });

      const { customerAccountsEnabled } = storefront;
      const sessionManager = customerAccountsEnabled
        ? await createCustomerSessionManager(event.request)
        : createRequestSessionManager(event.request);

      const shopifyRoute = handleShopifyRoutes({
        request: event.request,
        requestContext,
        sessionManager,
        storefrontClient,
        routeTemplates,
        handlers: customerAccountsEnabled
          ? [cartHandlers, customerSessionHandlers]
          : [cartHandlers],
      });
      if (shopifyRoute) return shopifyRoute;

      event.locals.storefront = storefront;
      event.locals.shopifyRequestContext = requestContext;
      event.locals.storefrontClient = storefrontClient;
      if (customerAccountsEnabled) {
        event.locals.customerSessionManager = sessionManager;
        event.locals.customerAccountClient = createRequestCustomerAccountClient(requestContext);
      }
    },
  ],
  onBeforeResponse: [
    (event) => {
      if (new URL(event.request.url).pathname === ACCOUNT_PATH) {
        event.response.headers.set("Cache-Control", PRIVATE_NO_STORE_CACHE_CONTROL);
      }

      event.locals.shopifyRequestContext?.applyResponseHeaders(event.response.headers);
      event.locals.csp?.applyResponseHeaders(event.response.headers);
    },
  ],
});
