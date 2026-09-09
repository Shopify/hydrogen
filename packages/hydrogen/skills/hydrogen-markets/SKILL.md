---
name: hydrogen-markets
description: >
  Guide for implementing Shopify Markets with Hydrogen. Use when adding
  market routing, country/language localization, Shopify Markets, subdomains,
  per-market domains, path-prefixed markets, defineShopifyI18n, locale switchers,
  hreflang links, Next.js App Router market routing, or Storefront API @inContext wiring.
---

# Markets

Markets are a routing concern plus Storefront API context. Hydrogen owns both halves once the storefront declares its locales: `defineShopifyI18n` describes which locales exist and how the URL encodes them, and `createShopifyRequestContext({ request, i18n })` resolves the request's locale from that definition. Queries that declare `$country` and `$language` with `@inContext(country: $country, language: $language)` receive those values from the resolved locale.

If the storefront uses Next.js App Router, read `references/nextjs.md` before writing code. Server Components do not receive a full `Request`, so the locale comes from the forwarded URL header or an explicit `locale` override.

---

## Core Rule

Define the storefront's locales once at module scope, then pass that definition where the app creates its Shopify request context:

```ts
// lib/i18n.ts
import { defineShopifyI18n } from "@shopify/hydrogen";

export const i18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US" },
  routing: {
    type: "pathname",
    locales: [
      { language: "EN", country: "CA" },
      { language: "FR", country: "CA" },
    ],
  },
});
```

```diff
import {
  createStorefrontClient,
  createShopifyRequestContext,
  gql,
} from "@shopify/hydrogen";
+import { i18n } from "./lib/i18n";

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
-  const requestContext = createShopifyRequestContext({
-    request,
-    i18n: DEFAULT_MARKET,
-  });
+  const requestContext = createShopifyRequestContext({
+    request,
+    i18n,
+  });

  const client = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: process.env.PUBLIC_STORE_DOMAIN!,
      publicStorefrontToken: process.env.PUBLIC_STOREFRONT_API_TOKEN!,
    },
  });

  return client.graphql(PRODUCTS_QUERY, {
    variables: { first: PRODUCTS_PAGE_SIZE },
  });
}
```

Do not pass `country` or `language` in every query call. The request context resolves the locale once at the request boundary and the client injects the context variables into queries that declare them.

`requestContext.i18n` is the definition passed in. `requestContext.locale` is the resolved locale for this request: `{ language, country, pathPrefix }` (`ShopifyMatchedLocale`). `pathPrefix` is `""` for the default locale and for domain routing, or a leading-slash prefix such as `/fr-ca` with no trailing slash. The Storefront client mirrors both as `client.i18n` and `client.locale`.

---

## Definition Shape

`defineShopifyI18n` returns its input unchanged with literal types preserved, so the definition is serializable and safe to import from server and client code. It validates once at module load, so a bad entry fails at startup rather than on the first request that hits it.

```ts
type ShopifyI18n = {
  defaultLocale: { language: ShopifyLanguageCode; country: ShopifyCountryCode };
  routing?:
    | { type: "pathname"; locales: readonly ShopifyPathnameLocale[] }
    | { type: "domain"; locales: readonly ShopifyDomainLocale[] };
};
```

- Omit `routing` for a single-locale storefront; every request resolves to `defaultLocale`.
- Codes are the Storefront API enums: `US`, `CA`, `EN`, `FR`, `PT_BR`.
- Extra per-locale fields (labels, `currency`) are kept on the entries returned by `getSupportedLocales(i18n)` and on `requestContext.locale`, so the app can carry its own metadata without a parallel map.
- Cookie-based, geolocation-based, or buyer-preference routing is not a routing type. Read those signals in the app and redirect to a canonical URL; the URL stays the only input to locale resolution.

---

## Path Prefixes

Use `type: "pathname"` when locales share one domain and the locale is encoded in the first path segment, like `/fr-ca/products/shirt`.

```ts
export const i18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US" },
  routing: {
    type: "pathname",
    locales: [
      { language: "FR", country: "CA" },
      { language: "PT_BR", country: "BR", pathSegment: "br" },
    ],
  },
});
```

- The prefix derives as `/{language}-{country}` lowercased with `_` replaced by `-`: `{ language: "FR", country: "CA" }` is served at `/fr-ca`. Set `pathSegment` when the derived segment is undesirable (`PT_BR` + `BR` would derive to `pt-br-br`). A segment is one path part with no slashes.
- `defaultLocale` is served unprefixed only and must not appear in `locales`; the definition throws if it does. Every page has one canonical URL.
- Unknown first segments resolve to `defaultLocale`. If the router has a `$locale` param, treat a matched param with an empty `requestContext.locale.pathPrefix` as a 404 so `/en-us/...` and `/xx/...` do not render the default locale under a second URL.
- Route templates stay prefix-free. Hydrogen prepends `requestContext.locale.pathPrefix` when it builds or matches standard route URLs, and `handleShopifyRoutes` matches registered handlers with the prefix stripped, so `/fr-ca/api/cart` reaches the `/api/cart` handler. Use the local `hydrogen-routing` skill for templates.

---

## Per-Market Domains And Subdomains

Use `type: "domain"` when each locale has its own hostname: `example.com`, `example.ca`, `fr.example.com`.

```ts
export const i18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US" },
  routing: {
    type: "domain",
    locales: [
      { language: "EN", country: "US", hostname: "example.com" },
      { language: "EN", country: "CA", hostname: "example.ca" },
      { language: "FR", country: "FR", hostname: "fr.example.com" },
    ],
  },
});
```

- Match is exact on `URL.hostname` (no port), so `fr.example.com`, `example.fr`, and `example.com` are three separate entries. Hostname comparison is case-insensitive.
- `defaultLocale` must be listed so it has a canonical hostname for links and sitemaps. Unrecognized hosts (localhost, preview URLs) resolve to `defaultLocale`.
- `www.` and other aliases are a redirect concern. Do not list them as locales.
- `pathPrefix` is always `""` under domain routing.

---

## Locale Switchers And Alternate Links

Use the exported helpers instead of string-building URLs:

```ts
import {
  getLocalizedHref,
  getSupportedLocales,
  isSameLocale,
  type ShopifyLocale,
} from "@shopify/hydrogen";
import { i18n } from "./lib/i18n";

export function getAlternateLinks(currentUrl: string, currentLocale: ShopifyLocale) {
  return getSupportedLocales(i18n)
    .filter((locale) => !isSameLocale(locale, currentLocale))
    .map((locale) => ({
      hreflang: `${locale.language}-${locale.country}`.toLowerCase(),
      href: getLocalizedHref(currentUrl, { i18n, locale }),
    }));
}
```

- `getLocalizedHref(href, { i18n, locale })` rewrites an href to the same page in another locale. Under pathname routing it returns a path with any existing locale prefix replaced; under domain routing it returns an absolute `https:` URL on the target hostname; with no routing it returns the input unchanged. It throws when `locale` is not defined in `i18n`.
- `getSupportedLocales(i18n)` returns every locale the definition can resolve to, default first, keeping `pathSegment` / `hostname` and any extra fields.
- `matchLocaleFromRequest(request, i18n)` and `matchLocaleFromUrl(url, i18n)` expose the same resolution the request context uses, for sitemaps or tests that hold a URL but no request context.

Persist an explicit buyer choice by redirecting to `getLocalizedHref(...)`; do not resolve the locale from a cookie on the server.

---

## Framework Exceptions

Read the relevant reference before applying the generic `Request` examples in frameworks that do not expose the full incoming request to server code.

- **Next.js App Router** — read `references/nextjs.md` first. Server Components can read `headers()` but not the current URL or a standard `Request`; the per-request client resolves the locale from the forwarded `x-storefront-url` header, and module-scope static clients pin `locale` explicitly.

---

## Rules

- **Define locales once with `defineShopifyI18n`.** Keep the definition in a module both server and client code can import. Do not hand-roll host allowlists or path parsers; the definition is the allowlist.
- **Resolve the locale through `createShopifyRequestContext({ request, i18n })`.** Pass a real `Request` when the framework has one so `request.url` drives matching. With `request: { headers }`, the forwarded `x-storefront-url` header is used instead.
- **Pass `locale` only when there is no meaningful URL.** Static rendering, background jobs, and module-scope clients set `locale: i18n.defaultLocale` (or another supported locale). The override is validated against the definition and throws for unsupported locales.
- **Read the resolved locale from `requestContext.locale`, never from `requestContext.i18n`.** `i18n` is the whole definition; `locale` is this request's `{ language, country, pathPrefix }`.
- **Use market-contextualized queries.** The Storefront client injects `country` and `language` variable values when the document declares `$country` and `$language`; it does not rewrite query text. Market-sensitive queries still need `@inContext(country: $country, language: $language)` or equivalent Storefront API context in the document.
- **Do not calculate currency locally.** Render `amount` and `currencyCode` returned by Shopify and format them with the local `hydrogen-money` skill's `formatMoney()` guidance.
- **Keep ShopifyScripts in the same locale.** Pass `requestContext.locale` (plus optional `currency`) as the `ShopifyScripts` `i18n` prop so Shopify globals match Storefront API context.
- **Keep route templates prefix-free.** Hydrogen applies `requestContext.locale.pathPrefix`; do not bake prefixes such as `/en-ca` into template values.
- **Keep translations separate.** Shopify Markets context localizes Shopify data. Application UI strings still need the app's translation system.
- **Treat geolocation as a hint, not truth.** Buyers travel, use VPNs, and intentionally choose markets. Redirect to a canonical locale URL when the app supports switching.
- **Ask before choosing the routing type.** If the app does not already make locale selection clear, ask whether path prefixes or per-locale domains should own it before writing code.

---

## Testing

Test locale resolution with plain `Request` objects against the definition. You do not need a framework test harness.

```ts
import { matchLocaleFromRequest } from "@shopify/hydrogen";
import { describe, expect, it } from "vitest";

import { i18n } from "./i18n";

describe("i18n", () => {
  it("resolves a prefixed locale", () => {
    const request = new Request("https://example.com/fr-ca/products/shirt");

    expect(matchLocaleFromRequest(request, i18n)).toEqual({
      language: "FR",
      country: "CA",
      pathPrefix: "/fr-ca",
    });
  });

  it("falls back to the default locale for unknown prefixes", () => {
    const request = new Request("https://example.com/xx/products/shirt");

    expect(matchLocaleFromRequest(request, i18n).pathPrefix).toBe("");
  });
});
```

Also test at least one Storefront API call through a mocked fetch and assert the GraphQL variables include the expected `country` and `language` when the query declares them.
