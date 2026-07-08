# Next.js App Router

Next splits Hydrogen routing across `proxy.ts` and `app/not-found.tsx`.

## `proxy.ts`

`proxy.ts` can short-circuit before routing, so put `handleShopifyRoutes` there. In Next 16+, the file is `proxy.ts` and the exported function is named `proxy`; older Next projects may use `middleware.ts` with an exported `middleware` function. It cannot inspect the routed response, so forward the original URL to not-found UI.

Resolve `buyerIp` from the app's trusted deployment headers before creating the private client. Use the buyer-IP guidance from `hydrogen-storefront-client`.

This shape assumes app-owned server-only helpers for `getBuyerIp`, `customerSession`, and `createSessionManager`. Do not import those names from Hydrogen.

```ts
import {
  createCartServerHandlers,
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";
import { NextResponse, type NextRequest } from "next/server";

const cartHandlers = createCartServerHandlers();
const customerAccountHandlers = createCustomerAccountServerHandlers({ customerSession });

export async function proxy(request: NextRequest) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  const buyerIp = getBuyerIp(request.headers);
  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      buyerIp,
    },
  });
  const sessionManager = await createSessionManager(request);

  const shopifyRoute = await handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    handlers: [cartHandlers, customerAccountHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  const requestHeaders = requestContext.getForwardedRequestHeaders();
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  requestContext.applyResponseHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
```

Use `proxy.ts` for Next 16+. Older Next projects may still use `middleware.ts`, but keep the file name and exported function name matched to the installed Next version.

Keep `handleShopifyRoutes` broad inside `proxy.ts`. Do not manually whitelist Hydrogen-owned path regexes before calling it; `handleShopifyRoutes` already no-ops for unmatched app routes, and manually duplicating its route list goes stale when Hydrogen adds handlers. The matcher should exclude static Next assets, not app pages.

Next docs warn that Proxy is not for slow data fetching or full session management. For Customer Account API this means `proxy.ts` may create the request context and local session manager needed by registered handlers, but access-token refresh belongs to the registered `/account/refresh` handler, not generic app-page proxy work.

## `app/not-found.tsx`

```tsx
import { handleShopifyRedirects } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getStorefrontClient } from "./lib/storefront";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const url = (await headers()).get("x-storefront-url");

  if (url) {
    const result = await handleShopifyRedirects({
      request: new Request(url),
      routeTemplates,
      storefrontClient: await getStorefrontClient(),
    });
    const location = result?.headers.get("location");
    if (location) redirect(location);
  }

  return <main><h1>404</h1></main>;
}
```

`force-dynamic` is mandatory because `headers()` and `redirect()` are per-request APIs.

## Storefront Client

In server components, use a cached server-only factory that reads `headers()` and creates a private request-scoped client. In `proxy.ts`, use the actual `NextRequest` so URL, signal, and forwarded headers are preserved. `requestContext.getForwardedRequestHeaders()` carries the original URL through `x-storefront-url` for `not-found.tsx`.

When a Server Component or layout reads Customer Account session state, it must opt out of static caching. `await cookies()` is a request-time API and opts the route into dynamic rendering, but prefer making account/session boundaries explicit with `export const dynamic = "force-dynamic"` and `export const fetchCache = "force-no-store"` on pages or layouts that render account-derived UI. For smaller server-only helpers, call Next's no-store API before session-derived work if the route segment is not already dynamic.

## Customer Account API

Register `createCustomerAccountServerHandlers({ customerSession })` with `handleShopifyRoutes`; do not create separate Next Route Handlers for the default login, authorize, refresh, or logout flow. The registered handlers own `GET /account/login`, `GET /account/authorize`, `GET /account/refresh`, and `POST /account/logout`, including session commits, sanitized redirects, logout CSRF protection, and `cache-control: no-store`.

Use Server Components for read-only account state only. Header account links should call `customerSession.isLoggedIn()` through an app helper that only exposes `ReadonlyCustomerSessionManager`. Account pages that need Customer Account GraphQL should call `customerSession.getAccessToken()` first. If `isLoggedIn()` is true but `getAccessToken()` returns `undefined`, redirect once to `/account/refresh?return_to=...` and let the registered refresh handler commit new cookies before rendering private data. If `isLoggedIn()` is false, show login UI or redirect to `/account/login` instead. Include a one-shot refresh guard so a failed refresh falls back to login or an account error state instead of looping.

Only expose `WritableCustomerSessionManager` inside response boundaries that can commit the session cookie, such as the registered `/account/refresh` handler or a custom route/server function that returns the final response.

## Gotchas

- Next's `redirect()` does not preserve Hydrogen's `301` status. If permanent redirect status matters, use a framework escape hatch that can return the `Response` directly.
- Do not run Storefront URL redirects in `proxy.ts`; that would add a Storefront API request to every app route.
- Keep the matcher broad enough to include `/admin`, `/api/cart`, and `/api/{version}/graphql.json`, but exclude static Next assets.
- Customer Account session manager initialization should be local session storage work only, such as encrypted cookie decrypt/encrypt. Token endpoint refresh belongs to `/account/refresh`, not the generic proxy path.
