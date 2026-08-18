# Next.js App Router

Next splits Hydrogen routing across `proxy.ts` and `app/not-found.tsx`.

## `proxy.ts`

`proxy.ts` can short-circuit before routing, so put `handleShopifyRoutes` there. In Next 16+, the file is `proxy.ts` and the exported function is named `proxy`; older Next projects may use `middleware.ts` with an exported `middleware` function. It cannot inspect the routed response, so forward the original URL to not-found UI.

The scaffold defaults to a public client; `NEXT_PUBLIC_STOREFRONT_API_TOKEN` may be unset, which means tokenless access (all mock.shop supports). Once the app has a private token and trusted buyer context, switch to `type: "private"` and resolve `buyerIp` from the app's trusted deployment headers per the buyer-IP guidance from `hydrogen-storefront-client`.

This shape assumes app-owned server-only helpers for `customerSession` and `createSessionManager`. Do not import those names from Hydrogen.

```ts
import {
  createCartServerHandlers,
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";
import { NextResponse, type NextRequest } from "next/server";

const cartHandlers = createCartServerHandlers({ customerSession });
const customerAccountHandlers = createCustomerAccountServerHandlers({
  customerSession,
  cartServerHandlers: cartHandlers,
});

export async function proxy(request: NextRequest) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: process.env.NEXT_PUBLIC_STORE_DOMAIN!,
      publicStorefrontToken: process.env.NEXT_PUBLIC_STOREFRONT_API_TOKEN,
    },
  });
  const sessionManager = await createSessionManager(request);

  const shopifyRoute = handleShopifyRoutes({
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

The proxy returns a matched promise directly so Next owns any rejection. If the app adds a request-level `try/catch` that returns a custom error response, use `return await shopifyRoute` inside that boundary after the truthy check.

Use `proxy.ts` for Next 16+. Older Next projects may still use `middleware.ts`, but keep the file name and exported function name matched to the installed Next version.

Keep `handleShopifyRoutes` broad inside `proxy.ts`. Do not manually whitelist Hydrogen-owned path regexes before calling it; `handleShopifyRoutes` already no-ops for unmatched app routes, and manually duplicating its route list goes stale when Hydrogen adds handlers. The matcher should exclude static Next assets, not app pages.

Next docs warn that Proxy is not for slow data fetching or full session management. For Customer Account API this means `proxy.ts` may create the request context and local session manager needed by registered handlers, but access-token refresh belongs to the registered `/account/refresh` handler, not generic app-page proxy work.

## `app/not-found.tsx`

```tsx
import { handleShopifyRedirects } from "@shopify/hydrogen";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getStorefrontClient } from "@/lib/storefront";
import { routeTemplates } from "@/lib/route-templates";

export default function NotFound() {
  return (
    <div>
      <Suspense fallback={null}>
        <RedirectChecker />
      </Suspense>
      <h1>404</h1>
    </div>
  );
}

async function RedirectChecker() {
  await connection();
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

  return null;
}
```

With `cacheComponents: true`, keep request-time work in an async child under `<Suspense>` and call `connection()` before `headers()`. Do not add `export const dynamic` / `fetchCache` / `revalidate` route config under Cache Components.

## Storefront Client

In server components, use a cached server-only factory that reads `headers()` and creates a request-scoped client (public by default). In `proxy.ts`, use the actual `NextRequest` so URL, signal, and forwarded headers are preserved. `requestContext.getForwardedRequestHeaders()` carries the original URL through `x-storefront-url` for `not-found.tsx`.

When a Server Component or layout reads Customer Account session state under Cache Components, put that read below an explicit dynamic boundary (`connection()` + `<Suspense>`). Do not rely on static route-segment config that Cache Components rejects.

## Customer Account API

Register the Customer Account handlers shown above with `handleShopifyRoutes`; do not create separate Next Route Handlers for the default login, authorize, refresh, or logout flow. The registered handlers own `GET /account/login`, `GET /account/authorize`, `GET /account/refresh`, and `POST /account/logout` — see `createCustomerAccountServerHandlers` for the response contract. Link to `/account/login` and submit `/account/logout` with plain `<a>`/`<form>`, not `next/link` — those handlers return raw external redirects.

Because `proxy.ts` returns before RSC render begins, a session mutation made during render cannot be committed — which is why account pages read with `getAccessToken()` and delegate refresh to the registered `/account/refresh` handler.

Use Server Components for read-only account state only. Header account links should call `customerSession.isLoggedIn()` through an app helper that only exposes `ReadonlyCustomerSessionManager`. Account pages that need Customer Account GraphQL should call `customerSession.getAccessToken()` first. If `isLoggedIn()` is true but `getAccessToken()` returns `undefined`, redirect once to `/account/refresh?return_to=...` and let the registered refresh handler commit new cookies before rendering private data. If `isLoggedIn()` is false, show login UI or redirect to `/account/login` instead. Include a one-shot refresh guard so a failed refresh falls back to login or an account error state instead of looping.

Only expose `WritableCustomerSessionManager` inside response boundaries that can commit the session cookie, such as the registered `/account/refresh` handler or a custom route/server function that returns the final response.

## Gotchas

- Next's `redirect()` does not preserve Hydrogen's `301` status. If permanent redirect status matters, use a framework escape hatch that can return the `Response` directly.
- Do not run Storefront URL redirects in `proxy.ts`; that would add a Storefront API request to every app route.
- Keep the matcher broad enough to include `/admin`, `/api/cart`, and `/api/{api-version}/graphql.json`, but exclude static Next assets.
- Customer Account session manager initialization should be local session storage work only, such as encrypted cookie decrypt/encrypt. Token endpoint refresh belongs to `/account/refresh`, not the generic proxy path.
