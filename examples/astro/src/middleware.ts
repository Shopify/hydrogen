import { getBuyerIp } from "@shared/buyer-ip";
import { i18n, storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import {
  createCartServerHandlers,
  createStorefrontClient,
  createShopifyRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
  type ShopifyRequestContextWithBuyerIp,
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
  const buyerIp = getBuyerIp(request.headers);
  const requestContext = createShopifyRequestContext({
    request,
    i18n,
    buyerIp,
  });
  const storefrontClient = createPrivateStorefrontClient(requestContext);
  const sessionManager = await createCustomerSessionManager(request);

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers: [cartHandlers, customerSessionHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

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
