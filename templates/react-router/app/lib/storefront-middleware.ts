import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRedirects,
  handleShopifyRoutes,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import { createCustomerAccountClient } from "@shopify/hydrogen/customer-account";
import type { WritableCustomerSessionManager } from "@shopify/hydrogen/customer-account";
import type { MiddlewareFunction } from "react-router";

import { cartHandlers } from "./cart-handlers";
import {
  defaultI18n,
  getBuyerIp,
  resolveCustomerAccountConfig,
  resolveStorefrontConfig,
} from "./config";
import {
  createCustomerSessionManager,
  customerAccountContext,
  getCustomerAccountSession,
} from "./customer-account";
import { createCustomerSessionHandlers } from "./customer-session-handlers";
import { cacheContext, envContext, waitUntilContext } from "./platform";
import { predictiveSearchHandlers } from "./predictive-search-handlers";
import { requestForShopifyContext } from "./request-sanitization";
import { routeTemplates } from "./route-templates";
import { storefrontClientContext } from "./storefront-context";

/**
 * Root middleware — the single Hydrogen request lifecycle entry point.
 *
 * One request-scoped private Storefront client is created per request and
 * shared by all loaders, cart handlers, and predictive-search handlers. SFAPI
 * response headers are merged onto the final response via
 * `requestContext.applyResponseHeaders`.
 *
 * Customer Accounts: a single `EncryptedCookieCustomerSession` session manager
 * (persistent across the OAuth login → callback redirect) is shared by
 * `handleShopifyRoutes` and the account route loader. The customer account
 * handlers are only registered when all required Customer Account env vars are
 * present. The session manager is committed onto every framework-router response
 * via `finalizeResponse` so token refreshes performed during `next()` are
 * flushed as `Set-Cookie`.
 */

const DISABLED_CUSTOMER_ACCOUNT_SESSION_SECRET = "disabled-customer-account-session-secret";

export const storefrontMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const env = context.get(envContext);
  const cache = context.get(cacheContext);
  const waitUntil = context.get(waitUntilContext);
  const buyerIp = getBuyerIp(request.headers);
  const requestContext = createShopifyRequestContext({
    request: requestForShopifyContext(request),
    i18n: defaultI18n,
    buyerIp,
  });

  const storefrontConfig = resolveStorefrontConfig(env);
  const customerAccountConfig = resolveCustomerAccountConfig(env, storefrontConfig.usingMockShop);
  const sessionManager = await createCustomerSessionManager(
    request,
    customerAccountConfig?.sessionSecret ?? DISABLED_CUSTOMER_ACCOUNT_SESSION_SECRET,
  );

  warnWhenUsingMockShop(storefrontConfig.usingMockShop);

  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: storefrontConfig.storeDomain,
      privateStorefrontToken: storefrontConfig.privateStorefrontToken,
      cache,
      waitUntil,
    },
  });

  const customerAccountClient = customerAccountConfig
    ? createCustomerAccountClient({
        shopId: customerAccountConfig.shopId,
        requestContext,
      })
    : undefined;
  const customerSession = customerAccountConfig
    ? getCustomerAccountSession(customerAccountConfig)
    : undefined;

  const handlers = [
    cartHandlers,
    predictiveSearchHandlers,
    ...(customerSession ? [createCustomerSessionHandlers(customerSession)] : []),
  ];

  const shopifyRoute = await handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    handlers,
  });
  // `handleShopifyRoutes` already commits the session manager (the customer
  // account handlers call `commitSession` and the result headers carry the
  // `Set-Cookie`) and applies SFAPI response headers, so the early-return
  // path needs no further post-processing.
  if (shopifyRoute) return shopifyRoute;

  // Loaders read both clients from context. Handlers don't read context, so
  // this only needs to be set on the framework-router path (after the
  // `shopifyRoute` early-return).
  context.set(storefrontClientContext, storefrontClient);
  if (customerAccountClient && customerSession) {
    context.set(customerAccountContext, {
      available: true,
      client: customerAccountClient,
      requestContext,
      session: customerSession,
      sessionManager,
    });
  } else {
    context.set(customerAccountContext, {
      available: false,
      requestContext,
      sessionManager,
    });
  }

  const response = await next();
  let finalResponse = response;
  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request,
      storefrontClient,
      routeTemplates,
    });
    if (redirect) finalResponse = redirect;
  }
  return finalizeResponse(requestContext, finalResponse, sessionManager);
};

/**
 * Post-process the framework-router response: commit any pending customer
 * session mutations (e.g. a token refresh performed by the account route
 * loader during `next()`) onto the response as `Set-Cookie`, then merge SFAPI
 * response headers. Mirrors the idiomatic React Router pattern of a middleware
 * wrapping `next()` and post-processing the response.
 */
async function finalizeResponse(
  requestContext: ShopifyRequestContext,
  response: Response,
  sessionManager: WritableCustomerSessionManager,
): Promise<Response> {
  const mutable = new Response(response.body, response);
  const sessionHeaders = await sessionManager.commit?.();
  if (sessionHeaders) appendHeaders(sessionHeaders, mutable.headers);
  requestContext.applyResponseHeaders(mutable.headers);
  return mutable;
}

function appendHeaders(source: HeadersInit, target: Headers): void {
  new Headers(source).forEach((value, key) => target.append(key, value));
}

let mockShopFallbackWarned = false;

function warnWhenUsingMockShop(usingMockShop: boolean): void {
  if (!usingMockShop || mockShopFallbackWarned) return;

  // mock.shop accepts this template's well-known private token, preserving the
  // request-scoped private client contract while running without store secrets.
  mockShopFallbackWarned = true;
  console.warn(
    `[hydrogen-template-react-router] No PRIVATE_STOREFRONT_API_TOKEN found — ` +
      `running against mock.shop. Set PRIVATE_STOREFRONT_API_TOKEN to hit a real store.`,
  );
}
