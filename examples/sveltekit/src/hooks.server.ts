import { env } from "$env/dynamic/private";
import { createCustomerSessionManager, customerSessionHandlers } from "$lib/customer-account";
import { routeTemplates } from "$lib/route-templates";
import { getRuntimeEnv } from "@shared/private-env";
import { createRequestSessionManager } from "@shared/request-session";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import { createModeStorefrontClient } from "@shared/storefront-client";
import { resolveStorefrontMode } from "@shared/storefront-mode";
import {
  createCartServerHandlers,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import type { Handle } from "@sveltejs/kit";
import { LRUCache } from "lru-cache";

export const cartHandlers = createCartServerHandlers();
const storefrontCache = createStorefrontCacheAdapter(
  new LRUCache<string, object>({ max: STOREFRONT_CACHE_MAX_ENTRIES }),
);

export const handle: Handle = async ({ event, resolve }) => {
  const storefront = resolveStorefrontMode(getRuntimeEnv(env));
  const { requestContext, storefrontClient } = createModeStorefrontClient({
    storefront,
    request: event.request,
    cache: storefrontCache,
  });
  const sessionManager = storefront.customerAccountsEnabled
    ? await createCustomerSessionManager(event.request)
    : createRequestSessionManager(event.request);

  const shopifyRoute = handleShopifyRoutes({
    request: event.request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers: storefront.customerAccountsEnabled
      ? [cartHandlers, customerSessionHandlers]
      : [cartHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  event.locals.storefront = storefront;
  event.locals.shopifyRequestContext = requestContext;
  event.locals.storefrontClient = storefrontClient;

  const response = await resolve(event);

  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request: event.request,
      routeTemplates,
      storefrontClient,
    });

    if (redirect) return redirect;
  }

  const finalResponse = new Response(response.body, response);
  requestContext.applyResponseHeaders(finalResponse.headers);
  return finalResponse;
};
