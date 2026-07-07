import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n, storefrontConfig } from "@shared/config";
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
  type ShopifyRequestContext,
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
  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
  });
  const storefrontClient = createPrivateStorefrontClient(request, requestContext);
  const sessionManager = await createCustomerSessionManager(request);

  const kitRoute = await handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    handlers: [cartHandlers, customerSessionHandlers],
  });
  if (kitRoute) return kitRoute;

  locals.shopifyRequestContext = requestContext;
  locals.storefrontClient = storefrontClient;

  const response = await next();

  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request,
      routeTemplates,
      storefrontClient,
    });
    if (redirect) {
      return applyStorefrontResponseHeaders(requestContext, redirect);
    }
  }

  return applyStorefrontResponseHeaders(requestContext, response);
});

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
