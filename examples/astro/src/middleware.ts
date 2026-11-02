import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n, storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import {
  createCartServerHandlers,
  createContentSecurityPolicy,
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
    i18n: defaultI18n,
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

  // Astro's island scripts and Shopify's bootstrap scripts are inline, and Astro cannot share a
  // nonce with them, so this policy allows inline scripts explicitly.
  const csp = createContentSecurityPolicy({
    shop: { storeDomain: storefrontConfig.storeDomain },
    nonce: false,
    directives: {
      scriptSrc: ["'unsafe-inline'"],
      styleSrc: ["https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
    },
  });

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
  csp.applyResponseHeaders(finalResponse.headers);
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
