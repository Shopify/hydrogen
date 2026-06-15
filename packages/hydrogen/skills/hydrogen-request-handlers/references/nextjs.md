# Next.js App Router

Next splits Hydrogen routing across `proxy.ts` and `app/not-found.tsx`.

## `proxy.ts`

`proxy.ts` can short-circuit before routing, so put `handleShopifyRoutes` there. It cannot inspect the routed response, so forward the original URL to not-found UI.

Resolve `buyerIp` from the app's trusted deployment headers before creating the private client. Use the buyer-IP guidance from `hydrogen-storefront-client`.

```ts
import {
  createCartServerHandlers,
  createStorefrontClient,
  createStorefrontRequestContext,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

const cartHandlers = createCartServerHandlers();

export async function proxy(request: NextRequest) {
  const requestContext = createStorefrontRequestContext(request);
  const buyerIp = getBuyerIp(request.headers);
  const storefrontClient = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      buyerIp,
      requestContext,
      i18n: { country: "US", language: "EN" },
    },
  });

  const shopifyRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
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

Use `proxy.ts` for Next 16+. Older Next projects may still use `middleware.ts`, but do not rename a working project without checking its version and conventions.

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

## Gotchas

- Next's `redirect()` does not preserve Hydrogen's `301` status. If permanent redirect status matters, use a framework escape hatch that can return the `Response` directly.
- Do not run Storefront URL redirects in `proxy.ts`; that would add a Storefront API request to every app route.
- Keep the matcher broad enough to include `/admin`, `/api/cart`, and `/api/{version}/graphql.json`, but exclude static Next assets.
