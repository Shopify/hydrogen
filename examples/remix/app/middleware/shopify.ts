import {
  createPredictiveSearchServerHandlers,
  createShopifyRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";
import { createContextKey, type Middleware } from "remix/router";
import { Session } from "remix/session";

import { cartHandlers } from "../lib/cart.ts";
import {
  createCustomerAccount,
  createCustomerSessionManager,
  type CustomerAccount,
} from "../lib/customer-account.ts";
import { localizePath } from "../lib/public/i18n.ts";
import { routeTemplates } from "../lib/public/route-templates.ts";
import { createAppStorefrontClient, type AppStorefrontClient } from "../lib/storefront.ts";
import { requireContext } from "./context.ts";
import { LocaleContext } from "./locale.ts";
import { RuntimeContext } from "./runtime.ts";

export type Shopify = {
  customerAccount: CustomerAccount;
  requestContext: ShopifyRequestContext;
  storefront: AppStorefrontClient;
};

export const ShopifyContext = createContextKey<Shopify>();
const shopifyProperty = { property: "shopify" } as const;

const predictiveSearchHandlers = createPredictiveSearchServerHandlers();

/**
 * Wires Hydrogen into the request lifecycle:
 *
 * 1. Creates one Shopify request context, Storefront client, and customer session for
 *    the request, and exposes them as `context.shopify`.
 * 2. Lets `handleShopifyRoutes` answer Shopify-owned routes (`/api/cart`, cart
 *    permalinks, Customer Account OAuth, predictive search, the Storefront API proxy,
 *    `?variant=` redirects) before the app router sees them.
 * 3. Checks Shopify redirects only after the app router returns a 404.
 *
 * `shopifyResponseHeaders()` applies Hydrogen's response headers afterwards.
 */
export function shopify(): Middleware<{
  key: typeof ShopifyContext;
  value: Shopify;
  property: "shopify";
}> {
  return async (context, next) => {
    const runtime = requireContext(context, RuntimeContext, "runtime");
    const { buyerIp, env } = runtime;
    const locale = context.get(LocaleContext);
    const session = requireContext(context, Session, "session");
    // Hydrogen route handlers match the prefix-free path, like the app router does.
    const request = requestWithUrl(context.request, context.url);

    const requestContext = createShopifyRequestContext({ request, i18n: locale, buyerIp });
    const storefront = createAppStorefrontClient(runtime, requestContext);
    const customerAccount = createCustomerAccount({
      env,
      requestContext,
      sessionManager: createCustomerSessionManager(session, context.url.origin),
    });
    const customerAccountHandlers = createCustomerAccountServerHandlers({
      customerSession: customerAccount.session,
      defaultPostLoginRedirectPathname: localizePath("/account", locale.pathPrefix),
      loginFailedRedirectPath: localizePath("/account?login=failed", locale.pathPrefix),
      postLogoutRedirectUri: localizePath("/", locale.pathPrefix),
    });

    const shopifyRoute = handleShopifyRoutes({
      request,
      requestContext,
      sessionManager: customerAccount.sessionManager,
      storefrontClient: storefront,
      routeTemplates,
      handlers: [cartHandlers, predictiveSearchHandlers, customerAccountHandlers],
    });
    if (shopifyRoute) return localizeRedirect(await shopifyRoute, locale.pathPrefix, context.url);

    context.set(ShopifyContext, { customerAccount, requestContext, storefront }, shopifyProperty);

    const response = await next();

    if (response.status === 404) {
      const redirect = await handleShopifyRedirects({
        request,
        storefrontClient: storefront,
        routeTemplates,
      });
      if (redirect) {
        // The 404 page has already started streaming; release it.
        await response.body?.cancel();
        return localizeRedirect(redirect, locale.pathPrefix, context.url);
      }
    }

    return response;
  };
}

/**
 * Applies Hydrogen's response headers, such as `private` caching for personalized
 * responses. It runs outside the session middleware, because Hydrogen expects the
 * session's `Set-Cookie` header to be on the response before it decides on caching.
 */
export function shopifyResponseHeaders(): Middleware {
  return async (context, next) => {
    const response = await next();
    // Unset when a Shopify-owned route answered, because `shopify()` returns before setting it.
    const shopify = context.get(ShopifyContext);
    return shopify ? applyResponseHeaders(shopify.requestContext, response) : response;
  };
}

function requestWithUrl(request: Request, url: URL): Request {
  if (request.url === url.href) return request;
  // Share the body: Hydrogen reads it only when one of its routes matches.
  return new Request(url, request);
}

/** Keeps same-origin Shopify redirects inside the active locale's path prefix. */
function localizeRedirect(response: Response, pathPrefix: string, requestUrl: URL): Response {
  const location = response.headers.get("Location");
  if (!pathPrefix || !location || response.status < 300 || response.status >= 400) {
    return response;
  }

  const target = new URL(location, requestUrl);
  const isLocalized =
    target.pathname === pathPrefix || target.pathname.startsWith(`${pathPrefix}/`);
  if (target.origin !== requestUrl.origin || isLocalized) return response;

  const localized = new Response(response.body, response);
  localized.headers.set(
    "Location",
    localizePath(`${target.pathname}${target.search}${target.hash}`, pathPrefix),
  );
  return localized;
}

function applyResponseHeaders(requestContext: ShopifyRequestContext, response: Response) {
  try {
    requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    // Redirects and some fetched responses have immutable headers.
    const mutable = new Response(response.body, response);
    requestContext.applyResponseHeaders(mutable.headers);
    return mutable;
  }
}
