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
  createStorefrontClient,
  createShopifyRequestContext,
  type ShopifyRequestContextWithBuyerIp,
  type ShopifyRequestContext,
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
    handlers: [cartHandlers, customerSessionHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

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

  return applyStorefrontResponseHeaders(requestContext, response);
};

function applyStorefrontResponseHeaders(
  requestContext: Pick<ShopifyRequestContext, "applyResponseHeaders">,
  response: Response,
): Response {
  try {
    requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const mutableResponse = new Response(response.body, response);
    requestContext.applyResponseHeaders(mutableResponse.headers);
    return mutableResponse;
  }
}

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
