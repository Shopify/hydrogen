import { env } from "$env/dynamic/private";
import { createCustomerSessionManager, customerSessionHandlers } from "$lib/customer-account";
import { routeTemplates } from "$lib/route-templates";
import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n, storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  STOREFRONT_CACHE_MAX_ENTRIES,
  createStorefrontCacheAdapter,
} from "@shared/storefront-cache";
import { handleShopifyRedirects, handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createCartServerHandlers,
  createContentSecurityPolicy,
  createStorefrontClient,
  createShopifyRequestContext,
  type ShopifyRequestContextWithBuyerIp,
} from "@shopify/hydrogen";
import type { Handle } from "@sveltejs/kit";
import { LRUCache } from "lru-cache";

export const cartHandlers = createCartServerHandlers();
const storefrontCache = createStorefrontCacheAdapter(
  new LRUCache<string, object>({ max: STOREFRONT_CACHE_MAX_ENTRIES }),
);

export const handle: Handle = async ({ event, resolve }) => {
  const buyerIp = getBuyerIp(event.request.headers);
  const requestContext = createShopifyRequestContext({
    request: event.request,
    i18n: defaultI18n,
    buyerIp,
  });
  const storefrontClient = createPrivateStorefrontClient(requestContext);
  const sessionManager = await createCustomerSessionManager(event.request);

  const shopifyRoute = handleShopifyRoutes({
    request: event.request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers: [cartHandlers, customerSessionHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  // SvelteKit's hydration script and Shopify's bootstrap scripts are inline, and SvelteKit
  // cannot share a nonce with components, so this policy allows inline scripts explicitly.
  const csp = createContentSecurityPolicy({
    shop: { storeDomain: storefrontConfig.storeDomain },
    nonce: false,
    directives: {
      scriptSrc: ["'unsafe-inline'"],
      styleSrc: ["https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
    },
  });

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
  csp.applyResponseHeaders(finalResponse.headers);
  return finalResponse;
};

function createPrivateStorefrontClient(requestContext: ShopifyRequestContextWithBuyerIp) {
  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: storefrontConfig.storeDomain,
      privateStorefrontToken: getPrivateStorefrontToken(env),
      cache: storefrontCache,
    },
  });
}
