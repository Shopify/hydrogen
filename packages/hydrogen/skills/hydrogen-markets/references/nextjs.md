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
import type { StorefrontRequestContext } from "@shopify/hydrogen";

type Market = {
  country: string;
  language: string;
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

export function getMarketFromRequestContext(
  requestContext: Pick<StorefrontRequestContext, "url">,
): Market {
  if (!requestContext.url) return DEFAULT_MARKET;

  const { hostname } = new URL(requestContext.url);
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
  createStorefrontRequestContext,
} from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import { getMarketFromRequestContext } from "./markets";

export const getStorefrontClient = cache(async () => {
  const requestContext = createStorefrontRequestContext({ headers: await headers() });

  return createStorefrontClient({
    type: "public",
    config: {
      ...storefrontConfig,
      requestContext,
      i18n: getMarketFromRequestContext(requestContext),
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
};

const DEFAULT_MARKET = {
  country: "US",
  language: "EN",
} satisfies Market;

const MARKET_BY_PARAM = {
  "en-ca": { country: "CA", language: "EN" },
  "fr-fr": { country: "FR", language: "FR" },
} satisfies Record<string, Market>;

export function getMarketFromParam(marketParam: string): Market {
  return MARKET_BY_PARAM[marketParam.toLowerCase()] ?? DEFAULT_MARKET;
}
```

For static or ISR-cached pages, use a shared-rate-limit client and pass the market from route params. The page can be prerendered when the route uses `generateStaticParams` and does not call request-time APIs like `headers()` or `cookies()`.

```ts
// app/lib/static-storefront.ts
import { createStorefrontClient } from "@shopify/hydrogen";

import { getMarketFromParam } from "./path-markets";

export function createStaticStorefrontClient(marketParam: string) {
  return createStorefrontClient({
    type: "private_shared_rate_limit",
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
      i18n: getMarketFromParam(marketParam),
    },
  });
}
```

Use the query shape from `SKILL.md`: declare `$country` and `$language`, use `@inContext`, and let the client inject the market variables. Use the private per-buyer client instead when the page needs buyer-specific headers, cookies, or personalized data. That path becomes dynamic because it must read request-time data.

---

## Raw URL Fallback

Use raw URLs only when host headers or route params cannot represent the market, usually with rewrites or catch-all route setups.

Prefer the Next.js example proxy pattern:

- In `proxy.ts`, create a request context from the `NextRequest`.
- Forward `requestContext.getForwardedRequestHeaders()` through `NextResponse.next({ request: { headers } })`.
- In Server Components, recreate the request context with `createStorefrontRequestContext({ headers: await headers() })` and read `requestContext.url`.

`createStorefrontRequestContext` already persists the URL through `x-storefront-url`, so do not set a parallel URL header unless the app cannot use the proxy handoff.
