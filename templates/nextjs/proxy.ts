import {
  type CacheInstance,
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { getCache } from "@vercel/functions";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { getBuyerIp } from "@/lib/buyer-ip";
import { cartHandlers } from "@/lib/cart-handlers";
import { i18n } from "@/lib/config";
import {
  createCustomerSessionManager,
  createEphemeralSessionManager,
} from "@/lib/customer-account";
import { getCustomerSessionHandlers } from "@/lib/customer-session-handlers";
import { toCanonicalDefaultUrl, toLocaleSegmentUrl } from "@/lib/locale-routing";
import { predictiveSearchHandlers } from "@/lib/predictive-search-handlers";
import { routeTemplates } from "@/lib/route-templates";
import { isCustomerAccountsAvailable, resolveStorefrontConfig } from "@/lib/storefront-config";

/**
 * Next.js request lifecycle (`hydrogen-request-handlers` /
 * `references/nextjs.md`). `proxy.ts` runs `handleShopifyRoutes` before framework
 * routing — Hydrogen-owned routes (`/api/cart`, `/api/predictive-search`,
 * `/api/{ver}/graphql.json`, `/admin`, …) short-circuit here. Storefront URL
 * redirects run in `app/not-found.tsx` (post-404), never here.
 *
 * Everything else is rewritten into the `app/[locale]` tree: the locale matched
 * from the request URL becomes the first path segment, so every page renders as
 * a static shell per locale from `params` alone (see `lib/locale-routing.ts`).
 *
 * The original request URL is forwarded to Server Components via
 * `requestContext.getForwardedRequestHeaders()` (carries `x-storefront-url` for
 * `not-found.tsx` and the per-buyer `lib/storefront.ts` client; without it every
 * Server Component request context silently resolves to the default locale).
 * SFAPI response headers are merged onto the forwarded response via
 * `requestContext.applyResponseHeaders`.
 *
 * mock.shop fallback: when no `PRIVATE_STOREFRONT_API_TOKEN` is present, the
 * shared `resolveStorefrontConfig()` falls back to `mock.shop` + its well-known
 * `mock-private-token` so the example runs with zero secrets.
 */
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const buyerIp = getBuyerIp(request.headers);
  const requestContext = createShopifyRequestContext({
    request,
    i18n,
    buyerIp,
  });

  const { storeDomain, privateStorefrontToken, storefrontId } = resolveStorefrontConfig();
  const cache: CacheInstance | undefined = process.env.VERCEL
    ? getCache({
        namespace: "hydrogen-v1",
        keyHashFunction: (key) => key,
      })
    : undefined;

  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain,
      privateStorefrontToken,
      storefrontId,
      cache,
      waitUntil: event.waitUntil.bind(event),
    },
  });

  // Sync — no `await` — so the handlers can never be a stray `Promise<boolean>`
  // that's always truthy when spread.
  const customerAccountsAvailable = isCustomerAccountsAvailable();
  const sessionManager = customerAccountsAvailable
    ? await createCustomerSessionManager(request)
    : createEphemeralSessionManager(request);
  const handlers = [
    cartHandlers,
    predictiveSearchHandlers,
    ...(customerAccountsAvailable ? [getCustomerSessionHandlers()] : []),
  ];

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers,
  });
  if (shopifyRoute) {
    // Matched Hydrogen-owned route.
    // `handleShopifyRoutes` already applies SFAPI response headers onto the
    // short-circuited response internally, so no `applyResponseHeaders` here.
    return shopifyRoute;
  }

  const requestUrl = new URL(request.url);
  const canonicalUrl = toCanonicalDefaultUrl(requestUrl, requestContext.locale, i18n);
  if (canonicalUrl) return NextResponse.redirect(canonicalUrl, PERMANENT_REDIRECT_STATUS);

  // Forward the original URL (via `x-storefront-url`) + request context headers
  // to Server Components, then merge SFAPI response headers onto the response.
  const requestHeaders = requestContext.getForwardedRequestHeaders();
  const internalUrl = toLocaleSegmentUrl(requestUrl, requestContext.locale);
  const response = internalUrl
    ? NextResponse.rewrite(internalUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  requestContext.applyResponseHeaders(response.headers);
  return response;
}

const PERMANENT_REDIRECT_STATUS = 308;

export const config = {
  // Exclude static Next assets; keep Hydrogen-owned paths (e.g. /admin,
  // /api/cart, /api/{ver}/graphql.json) reachable.
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
