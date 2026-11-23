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
import { defineMiddleware } from "astro:middleware";
import { LRUCache } from "lru-cache";

import { createCustomerSessionManager, customerSessionHandlers } from "./lib/customer-account";
import { routeTemplates } from "./route-templates";

const cartHandlers = createCartServerHandlers();
const storefrontCache = createStorefrontCacheAdapter(
  new LRUCache<string, object>({ max: STOREFRONT_CACHE_MAX_ENTRIES }),
);

export const onRequest = defineMiddleware(async ({ locals, request }, next) => {
  const storefront = resolveStorefrontMode(getRuntimeEnv());
  const { requestContext, storefrontClient } = createModeStorefrontClient({
    storefront,
    request,
    cache: storefrontCache,
  });
  const sessionManager = storefront.customerAccountsEnabled
    ? await createCustomerSessionManager(request)
    : createRequestSessionManager(request);

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers: storefront.customerAccountsEnabled
      ? [cartHandlers, customerSessionHandlers]
      : [cartHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  locals.storefront = storefront;
  locals.shopifyRequestContext = requestContext;
  locals.storefrontClient = storefrontClient;

  const response = await next();

  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request,
      routeTemplates,
      storefrontClient,
    });

    if (redirect) return redirect;
  }

  const finalResponse = new Response(response.body, response);
  requestContext.applyResponseHeaders(finalResponse.headers);
  const cspHeader = finalResponse.headers.get("Content-Security-Policy");
  if (cspHeader) {
    // Astro hashes styles, but does not expose style-src-attr in its CSP configuration.
    // Allow dynamic product swatches to set their background color.
    finalResponse.headers.set(
      "Content-Security-Policy",
      `${cspHeader} style-src-attr 'unsafe-inline';`,
    );
  }
  return finalResponse;
});
