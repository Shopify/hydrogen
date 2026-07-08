import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n } from "@shared/config";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

import { cartHandlers } from "@/lib/cart-handlers";
import { createCustomerSessionManager } from "@/lib/customer-account";
import { customerSessionHandlers } from "@/lib/customer-session-handlers";
import { predictiveSearchHandlers } from "@/lib/predictive-search-handlers";
import { MOCK_SHOP_DOMAIN, resolveStorefrontConfig } from "@/lib/storefront-config";

/**
 * Next.js request lifecycle (`hydrogen-request-handlers` /
 * `references/nextjs.md`). `proxy.ts` runs `handleShopifyRoutes` before framework
 * routing — Hydrogen-owned routes (`/api/cart`, `/api/predictive-search`,
 * `/api/{ver}/graphql.json`, `/admin`, …) short-circuit here. Storefront URL
 * redirects run in `app/not-found.tsx` (post-404), never here.
 *
 * The original request URL is forwarded to Server Components via
 * `requestContext.getForwardedRequestHeaders()` (carries `x-storefront-url` for
 * `not-found.tsx` and `getMarketFromHeaders`). SFAPI response headers are merged
 * onto the forwarded response via `requestContext.applyResponseHeaders`.
 *
 * mock.shop fallback: when no `PRIVATE_STOREFRONT_API_TOKEN` is present, the
 * shared `resolveStorefrontConfig()` falls back to `mock.shop` + its well-known
 * `mock-private-token` so the example runs with zero secrets.
 */
export async function proxy(request: NextRequest) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
  });

  const buyerIp = getBuyerIp(request.headers);
  const sessionManager = await createCustomerSessionManager(request);

  const { storeDomain, privateStorefrontToken } = resolveStorefrontConfig();

  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain,
      privateStorefrontToken,
      buyerIp,
    },
  });

  // Customer Accounts are only available on a real store (mock.shop has no
  // Customer Account API). Inline the resolved `storeDomain` check rather than
  // calling `isCustomerAccountsAvailable()` to avoid a second config read.
  // Sync — no `await` — so the handlers can never be a stray `Promise<boolean>`
  // that's always truthy when spread.
  const customerAccountsAvailable = storeDomain !== MOCK_SHOP_DOMAIN;
  const handlers = [
    cartHandlers,
    predictiveSearchHandlers,
    ...(customerAccountsAvailable ? [customerSessionHandlers] : []),
  ];

  const shopifyRoute = await handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    handlers,
  });
  if (shopifyRoute) {
    // Hydrogen-owned route (cart/predictive-search/SFAPI proxy/admin).
    // `handleShopifyRoutes` already applies SFAPI response headers onto the
    // short-circuited response internally, so no `applyResponseHeaders` here.
    return shopifyRoute;
  }

  // Forward the original URL (via `x-storefront-url`) + request context headers
  // to Server Components, then merge SFAPI response headers onto the response.
  const requestHeaders = requestContext.getForwardedRequestHeaders();
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  requestContext.applyResponseHeaders(response.headers);
  return response;
}

export const config = {
  // Exclude static Next assets; keep Hydrogen-owned paths (e.g. /admin,
  // /api/cart, /api/{ver}/graphql.json) reachable.
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
