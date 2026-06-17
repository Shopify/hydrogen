---
name: hydrogen-markets
description: >
  Guide for implementing Shopify Markets with Hydrogen. Use when adding
  market routing, country/language localization, Shopify Markets, subdomains,
  per-market domains, path-prefixed markets, Next.js App Router market routing,
  or Storefront API @inContext wiring.
---

# Markets

Markets are an application routing concern plus Storefront API context. Hydrogen does not prescribe how a storefront chooses a market. Use domains, subdomains, paths, cookies, buyer preferences, geolocation, or merchant config as needed.

The Hydrogen part is the required `i18n` property on `createStorefrontClient`. Resolve the market first, then create the client with static `i18n`. When a query declares `$country` and `$language` and uses `@inContext(country: $country, language: $language)`, the client injects those values from `i18n`.

If the storefront uses Next.js App Router, read `references/nextjs.md` before writing code. Server Components do not receive a full `Request`, so host-based and path-prefixed markets need Next-specific wiring.

---

## Core Rule

Add `i18n` where the app already creates its Storefront client:

```diff
import {
  createStorefrontClient,
  createStorefrontRequestContext,
  gql,
} from "@shopify/hydrogen";

const PRODUCTS_PAGE_SIZE = 12;

const PRODUCTS_QUERY = gql(`
-  query Products($first: Int!) {
+  query Products($first: Int!, $country: CountryCode, $language: LanguageCode)
+  @inContext(country: $country, language: $language) {
    products(first: $first) {
      nodes {
        title
      }
    }
  }
`);

export async function loadProducts(request: Request) {
  const requestContext = createStorefrontRequestContext(request);
+  const { country, language } = getMarketFromRequest(request);

  const client = createStorefrontClient({
    type: "public",
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN!,
      requestContext,
+      i18n: { country, language },
    },
  });

  return client.graphql(PRODUCTS_QUERY, {
    variables: { first: PRODUCTS_PAGE_SIZE },
  });
}
```

Do not pass `country` or `language` in every query call. Resolve the market once at the request boundary, set `i18n` when creating the client, and let the client inject the context variables into queries that declare them.

---

## Market Shape

Keep the resolver small and explicit. The Storefront API expects uppercase enum values like `US`, `CA`, `EN`, and `FR`.

```ts
type Market = {
  country: string;
  language: string;
};

const DEFAULT_MARKET = {
  country: "US",
  language: "EN",
} satisfies Market;
```

If the app needs labels, alternate domains, or path prefixes for navigation, keep those as application fields. Only `country` and `language` belong in `i18n`.

---

## Subdomains

Use this when each market lives under one storefront domain, like `ca.example.com` or `fr.example.com`.

```ts
const MARKET_BY_SUBDOMAIN = {
  ca: { country: "CA", language: "EN" },
  fr: { country: "FR", language: "FR" },
} satisfies Record<string, Market>;

export function getMarketFromRequest(request: Request): Market {
  const { hostname } = new URL(request.url);
  const [subdomain] = hostname.toLowerCase().split(".");

  return MARKET_BY_SUBDOMAIN[subdomain] ?? DEFAULT_MARKET;
}
```

This keeps market selection at the server boundary. Product queries, collection queries, cart queries, and checkout URLs all become market-aware when they use `@inContext`.

---

## Per-Market Domains

Use this when markets have separate buyer-facing domains, like `example.com`, `example.ca`, and `example.fr`.

```ts
const MARKET_BY_HOST = {
  "example.com": { country: "US", language: "EN" },
  "example.ca": { country: "CA", language: "EN" },
  "example.fr": { country: "FR", language: "FR" },
} satisfies Record<string, Market>;

export function getMarketFromRequest(request: Request): Market {
  const { hostname } = new URL(request.url);
  const host = hostname.toLowerCase();

  return MARKET_BY_HOST[host] ?? DEFAULT_MARKET;
}
```

This is the cleanest option when SEO, legal entities, or merchant operations require distinct domains. The storefront does not need a visible market prefix in the path because the host already carries the market.

---

## Path Prefixes

Use this when markets share one domain and the market is encoded in the pathname, like `/en-ca/products/shirt` or `/fr-fr/products/shirt`.

```ts
type PathMarket = Market & {
  pathPrefix: string;
};

const FIRST_PATH_SEGMENT_INDEX = 0;

const MARKET_BY_PATH_PREFIX = {
  "en-ca": { country: "CA", language: "EN", pathPrefix: "en-ca" },
  "fr-fr": { country: "FR", language: "FR", pathPrefix: "fr-fr" },
} satisfies Record<string, PathMarket>;

function getFirstPathSegment(pathname: string): string | undefined {
  return pathname.split("/").filter(Boolean)[FIRST_PATH_SEGMENT_INDEX];
}

export function getMarketFromRequest(request: Request): PathMarket | Market {
  const { pathname } = new URL(request.url);
  const pathPrefix = getFirstPathSegment(pathname);

  if (!pathPrefix) return DEFAULT_MARKET;

  return MARKET_BY_PATH_PREFIX[pathPrefix.toLowerCase()] ?? DEFAULT_MARKET;
}

export function localizePath(pathname: string, market: PathMarket | Market): string {
  if (!("pathPrefix" in market)) return pathname;

  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/${market.pathPrefix}${normalizedPathname}`;
}
```

The router should strip or interpret the prefix before matching product and collection routes. Hydrogen only needs the resolved `country` and `language`.

---

## Framework Exceptions

Read the relevant reference before applying the generic `Request` examples in frameworks that do not expose the full incoming request to server code.

- **Next.js App Router** — read `references/nextjs.md` first. Server Components can read `headers()` and route `params`, but not the current URL or a standard `Request`; host-based markets, path-prefix markets, and raw URL fallback each need different wiring.

---

## Rules

- **Use whatever market strategy fits the store.** Hydrogen should not force domains, subdomains, pathnames, or detection policy.
- **Resolve the market on the server from a standard `Request`.** `new URL(request.url)` is enough for host and path strategies.
- **Use `i18n` as the Storefront API boundary.** It is required by the current client API. Always provide a default market rather than letting it be undefined.
- **Use market-contextualized queries.** The Storefront client injects `country` and `language` variable values when the document declares `$country` and `$language`; it does not rewrite query text. Market-sensitive queries still need `@inContext(country: $country, language: $language)` or equivalent Storefront API context in the document.
- **Do not calculate currency locally.** Render `amount` and `currencyCode` returned by Shopify and format them with the local `hydrogen-money` skill's `formatMoney()` guidance.
- **Keep analytics consent in the same market.** When the app configures Hydrogen analytics, pass the resolved `country` and `language` into the consent config too. Shopify's consent bootstrap uses those values alongside Storefront API context.
- **Keep translations separate.** Shopify Markets context localizes Shopify data. Application UI strings still need the app's translation system.
- **Treat geolocation as a hint, not truth.** Buyers travel, use VPNs, and intentionally choose markets. Persist explicit choices when the app supports switching.
- **Ask before choosing the strategy.** If the app does not already make market selection clear, ask whether domains, subdomains, path prefixes, cookies, buyer preference, geolocation, or merchant config should own it before writing code.

---

## Testing

Test market resolution with plain `Request` objects. You do not need a framework test harness.

```ts
import { describe, expect, it } from "vitest";

describe("getMarketFromRequest", () => {
  it("resolves a subdomain market", () => {
    const request = new Request("https://ca.example.com/products/shirt");

    expect(getMarketFromRequest(request)).toEqual({ country: "CA", language: "EN" });
  });
});
```

Also test at least one Storefront API call through a mocked fetch and assert the GraphQL variables include the expected `country` and `language` when the query declares them.
