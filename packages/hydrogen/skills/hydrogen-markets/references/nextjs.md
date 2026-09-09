# Next.js App Router

## Contents

- Definition
- Per-Request Client
- Static Client
- Path-Prefix Routes

Next.js App Router Server Components do not receive a standard `Request` object or direct access to the current URL. The locale still comes from the shared `defineShopifyI18n` definition; what changes is where `createShopifyRequestContext` reads the URL from:

- Per-request clients: `proxy.ts` forwards the original URL as `x-storefront-url`; a request context created from `{ headers: await headers() }` matches the locale from that header automatically.
- Module-scope static clients: there is no request URL, so pin `locale` explicitly.

Do not invent a second URL header or a parallel market map. There is no `lib/markets.ts` in the Next.js template; the definition lives in `lib/config.ts`.

---

## Definition

```ts
// lib/config.ts
import { defineShopifyI18n } from "@shopify/hydrogen";

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

Swap `routing` for `type: "pathname"` when locales share one domain. Omit `routing` for a single-locale storefront. The definition is the host allowlist; unrecognized hosts resolve to `defaultLocale`.

---

## Per-Request Client

`proxy.ts` creates a request context from the `NextRequest` and forwards `requestContext.getForwardedRequestHeaders()`. That handoff carries the original URL in `x-storefront-url`, and `createShopifyRequestContext` reads it when `request` has only `headers`.

```ts
// lib/storefront.ts
import "server-only";
import {
  createStorefrontClient,
  createShopifyRequestContext,
} from "@shopify/hydrogen";
import { headers } from "next/headers";
import { cache } from "react";

import { i18n, storefrontConfig } from "./config";

export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createShopifyRequestContext({
    request: { headers: requestHeaders },
    i18n,
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

`requestContext.locale` is the locale matched from the forwarded URL. `headers()` is a request-time API, so pages using this helper are dynamically rendered.

---

## Static Client

Module-scope clients have no request URL. Pin the locale so the request context does not need to match one:

```ts
// lib/storefront-static.ts
import "server-only";
import { createStorefrontClient, createShopifyRequestContext } from "@shopify/hydrogen";

import { i18n } from "./config";

const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n,
  locale: i18n.defaultLocale,
});

export const staticStorefrontClient = createStorefrontClient({
  type: "private_no_buyer_context",
  requestContext,
  config: {
    storeDomain: process.env.NEXT_PUBLIC_STORE_DOMAIN!,
    privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
  },
});
```

`locale` must be one of the definition's supported locales; the request context throws otherwise. Pages that use this client can be prerendered when the route uses `generateStaticParams` and does not call request-time APIs like `headers()` or `cookies()`.

---

## Path-Prefix Routes

With `type: "pathname"`, model the prefix as a route segment such as `app/[locale]/products/[handle]/page.tsx` so the router can render the localized tree. Resolve the locale from the segment with `matchLocale` rather than a second lookup table, then create a static client for that locale:

```ts
// lib/static-storefront.ts
import "server-only";
import {
  createStorefrontClient,
  createShopifyRequestContext,
  matchLocale,
} from "@shopify/hydrogen";

import { i18n } from "./config";

export function createStaticStorefrontClient(localeParam: string) {
  const locale = matchLocale(`https://shopify.local/${localeParam}/`, i18n);
  const requestContext = createShopifyRequestContext({
    request: { headers: new Headers() },
    i18n,
    locale,
  });

  return createStorefrontClient({
    type: "private_no_buyer_context",
    requestContext,
    config: {
      storeDomain: process.env.NEXT_PUBLIC_STORE_DOMAIN!,
      privateStorefrontToken: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
    },
  });
}
```

Unknown segments resolve to `defaultLocale`; return `notFound()` from the page when `locale.pathPrefix` is `""` but a segment was present, so the default locale keeps one canonical URL. Use `getSupportedLocales(i18n)` in `generateStaticParams` to enumerate the prefixed locales.

Use the query shape from `SKILL.md`: declare `$country` and `$language`, use `@inContext`, and let the client inject the locale variables. Use the per-request client instead when the page needs buyer-specific headers, cookies, or personalized data; that path becomes dynamic because it reads request-time data.
