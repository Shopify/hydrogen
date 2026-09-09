import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n, storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
  type ShopifyRequestContextWithBuyerIp,
} from "@shopify/hydrogen";
import { createMiddleware } from "@tanstack/react-start";
import { LRUCache } from "lru-cache";

import { routeTemplates } from "~/lib/route-templates";

import { cartHandlers } from "./cart-handlers";
import {
  createCustomerSessionManager,
  createRequestCustomerAccountClient,
  customerSessionHandlers,
} from "./customer-account";
import { predictiveSearchHandlers } from "./predictive-search-handlers";

const storefrontCache = createStorefrontCacheAdapter(
  new LRUCache<string, object>({ max: STOREFRONT_CACHE_MAX_ENTRIES }),
);

function createPrivateStorefrontClient(requestContext: ShopifyRequestContextWithBuyerIp) {
  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: storefrontConfig.storeDomain,
      privateStorefrontToken: getPrivateStorefrontToken(),
      cache: storefrontCache,
    },
  });
}

/**
 * Global request middleware: runs for every request Start handles (SSR
 * documents, server-function RPCs, server routes).
 *
 * 1. Builds the request-scoped Shopify context (request context, private
 *    Storefront client, customer session, Customer Account client).
 * 2. Lets Hydrogen-owned routes (`/api/cart`, `/api/predictive-search`,
 *    `/account/login|authorize|logout`, `/api/{ver}/graphql.json`, `/admin`, …)
 *    short-circuit before routing by returning their `Response` directly.
 * 3. Threads the context to server functions via `next({ context })`.
 * 4. After the handler runs, commits the customer session cookie and applies
 *    Hydrogen's response headers. Cache-Control for personalized responses
 *    comes from Hydrogen (`markResponseAsPersonalized` inside the customer
 *    session APIs), so the middleware knows nothing about individual routes.
 *
 * Not-found and Shopify URL redirects are resolved inside the data server
 * functions (see `not-found.ts`) — this middleware only sees `/_serverFn/*`
 * URLs for RPCs and never runs for client-side navigations.
 */
export const shopifyRequestMiddleware = createMiddleware().server(async ({ request, next }) => {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
    buyerIp: getBuyerIp(request.headers),
  });
  const storefrontClient = createPrivateStorefrontClient(requestContext);
  const sessionManager = await createCustomerSessionManager(request);
  const customerAccountClient = createRequestCustomerAccountClient(requestContext);

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers: [cartHandlers, predictiveSearchHandlers, customerSessionHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  const result = await next({
    context: { request, requestContext, storefrontClient, sessionManager, customerAccountClient },
  });

  // Commit first so Hydrogen's Set-Cookie inspection sees the final header set.
  const sessionHeaders = await sessionManager.commit();
  const headers = new Headers(result.response.headers);
  for (const cookie of sessionHeaders?.getSetCookie() ?? []) {
    headers.append("Set-Cookie", cookie);
  }
  requestContext.applyResponseHeaders(headers);

  return {
    ...result,
    response: new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    }),
  };
});
