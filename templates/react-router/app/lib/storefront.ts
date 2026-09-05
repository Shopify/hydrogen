import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRedirects,
  handleShopifyRoutes,
  type CachingStrategy,
  type RequestScopedPrivateStorefrontClient,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import type { WritableCustomerSessionManager } from "@shopify/hydrogen/customer-account";
import { createContext, type MiddlewareFunction } from "react-router";

import { cartHandlers } from "./cart-handlers";
import {
  createCustomerAccountHandlers,
  createCustomerAccountRequestContext,
  createCustomerSessionManager,
  customerAccountContext,
} from "./customer-account";
import { cacheContext, envContext, runtimeConfigContext, waitUntilContext } from "./env";
import { requestForShopifyContext } from "./request-sanitization";
import { routeTemplates } from "./route-templates";
import { createRequestSessionManager } from "./session";
import { defaultI18n, resolveRuntimeConfig } from "./shop";

const BUYER_IP_HEADERS = ["oxygen-buyer-ip", "cf-connecting-ip", "x-forwarded-for"] as const;

export const storefrontClientContext =
  createContext<RequestScopedPrivateStorefrontClient<{ cache?: CachingStrategy }>>();

export const storefrontMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const env = context.get(envContext);
  const config = resolveRuntimeConfig(env);
  const sessionManager = config.customerAccount
    ? await createCustomerSessionManager(request, config.customerAccount.sessionSecret)
    : createRequestSessionManager(request);
  const shopifyRequest = requestForShopifyContext(request);
  const requestContext = createShopifyRequestContext({
    request: shopifyRequest,
    i18n: defaultI18n,
    buyerIp: getBuyerIp(request.headers),
  });
  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      cache: context.get(cacheContext),
      privateStorefrontToken: config.privateStorefrontToken,
      storeDomain: config.storeDomain,
      storefrontId: config.storefrontId,
      waitUntil: context.get(waitUntilContext),
    },
  });

  const customerAccount = config.customerAccount
    ? createCustomerAccountRequestContext(requestContext, config.customerAccount, sessionManager)
    : ({ available: false } as const);
  const handlers = [
    cartHandlers,
    ...(customerAccount.available ? [createCustomerAccountHandlers(customerAccount)] : []),
  ];

  const shopifyRoute = handleShopifyRoutes({
    request: shopifyRequest,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers,
  });
  if (shopifyRoute) {
    return finalizeRequestBodies(shopifyRoute, request, shopifyRequest);
  }

  context.set(storefrontClientContext, storefrontClient);
  context.set(customerAccountContext, customerAccount);
  context.set(runtimeConfigContext, config);

  const response = await finalizeRequestBodies(next(), request, shopifyRequest);
  let finalResponse = response;
  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request: shopifyRequest,
      storefrontClient,
      routeTemplates,
    });
    if (redirect) finalResponse = redirect;
  }

  return finalizeResponse(finalResponse, requestContext, sessionManager);
};

async function finalizeResponse(
  response: Response,
  requestContext: ShopifyRequestContext,
  sessionManager: WritableCustomerSessionManager,
): Promise<Response> {
  const mutableResponse = new Response(response.body, response);
  const sessionHeaders = await sessionManager.commit?.();
  if (sessionHeaders) {
    new Headers(sessionHeaders).forEach((value, key) => mutableResponse.headers.append(key, value));
  }
  requestContext.applyResponseHeaders(mutableResponse.headers);
  return mutableResponse;
}

function getBuyerIp(headers: Pick<Headers, "get">): string {
  for (const header of BUYER_IP_HEADERS) {
    const buyerIp = headers.get(header)?.split(",")[0]?.trim();
    if (buyerIp) return buyerIp;
  }
  if (import.meta.env.DEV) return "127.0.0.1";
  throw new Error(`${BUYER_IP_HEADERS.join(", ")} is required for private Storefront API clients`);
}

async function finalizeRequestBodies<T>(result: Promise<T>, ...requests: Request[]): Promise<T> {
  try {
    return await result;
  } finally {
    const bodies = [...new Set(requests.map((request) => request.body))];
    await Promise.allSettled(
      bodies.map((body) => (body && !body.locked ? body.cancel() : Promise.resolve())),
    );
  }
}
