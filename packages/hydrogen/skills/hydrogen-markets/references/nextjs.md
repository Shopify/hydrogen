# Next.js App Router

Next.js App Router Server Components do not receive a standard `Request` object or direct access to the current URL. Use the source that matches the market strategy:

- Host or subdomain markets: read the URL from Hydrogen's request context when the app proxy forwards it.
- Path-prefix markets: model the market as a route segment, such as `app/[market]/products/[handle]/page.tsx`, and read it from `params`.
- Raw URL markets: use the same request-context handoff as the Next.js example proxy; do not invent a second URL header.

---

## Host-Based Markets

Use this for domain or subdomain routing, like `example.ca`, `fr.example.com`, or `ca.example.com`.

This assumes the app uses the same proxy handoff as `examples/nextjs/proxy.ts`: create a request context from the `NextRequest`, forward `requestContext.getForwardedRequestHeaders()`, then recreate the request context from `headers()` in Server Components. That handoff includes the original URL.

```ts
// app/lib/markets.ts
type Market = {
  country: string;
  language: string;
  pathPrefix?: string;
};

const DEFAULT_MARKET = {
  country: "US",
  language: "EN",
} satisfies Market;

const MARKET_BY_HOST = {
  "example.com": { country: "US", language: "EN" },
  "example.ca": { country: "CA", language: "EN" },
  "fr.example.com": { country: "FR", language: "FR" },
} satisfies Record<string, Market>;

export function getMarketFromHeaders(headers: Pick<Headers, "get">): Market {
  const forwardedUrl = headers.get("x-storefront-url");
  if (!forwardedUrl) return DEFAULT_MARKET;

  const { hostname } = new URL(forwardedUrl);
  const host = hostname.toLowerCase();

  return MARKET_BY_HOST[host] ?? DEFAULT_MARKET;
}
```

Use an allowlist like `MARKET_BY_HOST`; do not blindly trust request hosts for anything security-sensitive.

```ts
// app/lib/storefront.ts
import "server-only";
import { storefrontConfig } from "@shared/config";
import {
  createStorefrontClient,
  createShopifyRequestContext,
} from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import { getMarketFromHeaders } from "./markets";

export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const request = { headers: requestHeaders };
  const requestContext = createShopifyRequestContext({
    request,
    i18n: getMarketFromHeaders(requestHeaders),
  });

  return createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: storefrontConfig.storeDomain,
      publicStorefrontToken: storefrontConfig.publicStorefrontToken,
    },
  });
});
```

`headers()` is a request-time API, so pages using this helper are dynamically rendered.

---

## Path-Prefix Markets

Use this for routes like `/en-ca/products/shirt` or `/fr-fr/products/shirt`. Model the market prefix as a route segment so Server Components can read it from `params` without `headers()`.

```ts
// app/lib/path-markets.ts
type Market = {
  country: string;
  language: string;
  pathPrefix?: string;
};

const DEFAULT_MARKET = {
  country: "US",
  language: "EN",
} satisfies Market;

const MARKET_BY_PARAM = {
  "en-ca": { country: "CA", language: "EN", pathPrefix: "/en-ca" },
  "fr-fr": { country: "FR", language: "FR", pathPrefix: "/fr-fr" },
} satisfies Record<string, Market>;

export function getMarketFromParam(marketParam: string): Market {
  return MARKET_BY_PARAM[marketParam.toLowerCase()] ?? DEFAULT_MARKET;
}
```

For static or ISR-cached pages, use a `private_no_buyer_context` client and pass the market from route params. The page can be prerendered when the route uses `generateStaticParams` and does not call request-time APIs like `headers()` or `cookies()`.

```ts
// app/lib/static-storefront.ts
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";

import { getMarketFromParam } from "./path-markets";

export function createStaticStorefrontClient(marketParam: string) {
  const requestContext = createShopifyRequestContext({
    request: { headers: new Headers() },
    i18n: getMarketFromParam(marketParam),
  });

  return createStorefrontClient({
    type: "private_no_buyer_context",
    requestContext,
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
    },
  });
}
```

Use the query shape from `SKILL.md`: declare `$country` and `$language`, use `@inContext`, and let the client inject the market variables. Use the private client with trusted buyer context instead when the page needs buyer-specific headers, cookies, or personalized data. That path becomes dynamic because it must read request-time data.

---

## Raw URL Fallback

Use raw URLs only when host headers or route params cannot represent the market, usually with rewrites or catch-all route setups.

Prefer the Next.js example proxy pattern:

- In `proxy.ts`, create a request context from the `NextRequest`.
- Forward `requestContext.getForwardedRequestHeaders()` through `NextResponse.next({ request: { headers } })`.
- In Server Components, recreate a request-like object with `request: { headers: await headers() }`, resolve the market from the forwarded URL header, then create the client request context with that `i18n`.

`createShopifyRequestContext` already persists the URL through `x-storefront-url`, so do not set a parallel URL header unless the app cannot use the proxy handoff.
