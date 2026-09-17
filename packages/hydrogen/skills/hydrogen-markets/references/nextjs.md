# Next.js App Router

## Contents

- Definition
- Static Pages: Locale As A Route Segment
- Proxy Rewrite
- Static Client Per Locale
- Localized Links And Metadata
- Per-Request Client
- Unmatched URLs

Static rendering and locale-from-the-request are incompatible in Next.js: any `headers()` or `cookies()` read opts the component out of the static shell. A prerender can only see the URL, so for static multi-locale pages the locale must live in the route tree as a `[locale]` param. The locale still comes from the shared `defineShopifyI18n` definition; what changes is where it is read from:

- Static pages: `params.locale`, resolved with `resolveSupportedLocale`, pinned on the request context via `locale`.
- Per-request (dynamic) components: `proxy.ts` forwards the original URL as `x-storefront-url`; a request context created from `{ headers: await headers() }` matches the locale from that header.

Do not invent a second URL header or a parallel market map. The definition lives in `lib/config.ts`.

---

## Definition

```ts
// lib/config.ts
import { defineShopifyI18n } from "@shopify/hydrogen";

export const i18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US", currency: "USD" },
  routing: {
    type: "pathname",
    locales: [
      { language: "FR", country: "CA", currency: "CAD" },
      { language: "PT_BR", country: "BR", currency: "BRL", pathSegment: "br" },
    ],
  },
});
```

Swap `routing` for `type: "domain"` with a `hostname` per locale when each locale has its own host. Omit `routing` for a single-locale storefront; the `[locale]` tree still works, it just has one param. Extra fields such as `currency` are carried through to `requestContext.locale` and `ShopifyScripts`.

---

## Static Pages: Locale As A Route Segment

Put every page under `app/[locale]`, make that layout the root layout, and enumerate the definition's locales in `generateStaticParams`. `getLocalePathSegment` is the identifier for a locale in a URL or param, defined for every locale regardless of routing type, and `resolveSupportedLocale` accepts it back.

```ts
// lib/locale.ts
import {
  getLocalePathSegment,
  getSupportedLocales,
  resolveSupportedLocale,
  type ShopifyLocale,
  type ShopifyMatchedLocale,
  UnsupportedLocaleError,
} from "@shopify/hydrogen";
import { notFound } from "next/navigation";

import { i18n } from "./config";

export type Locale = ShopifyMatchedLocale<typeof i18n>;

export function localeParams(): { locale: string }[] {
  return getSupportedLocales(i18n).map((locale) => ({ locale: getLocalePathSegment(locale) }));
}

export function resolveLocaleParam(segment: string): Locale {
  try {
    return resolveSupportedLocale(segment, i18n);
  } catch (error) {
    if (error instanceof UnsupportedLocaleError) notFound();
    throw error;
  }
}

/** BCP 47 for `<html lang>` and hreflang: PT_BR + BR -> `pt-BR`, ZH_TW + HK -> `zh-Hant-HK`. */
export function toLanguageTag({ language, country }: ShopifyLocale): string {
  const primary = { ZH_CN: "zh-Hans", ZH_TW: "zh-Hant" }[language] ?? language.replace(/_.*$/, "").toLowerCase();
  return `${primary}-${country}`;
}
```

```tsx
// app/[locale]/layout.tsx — the root layout
import { localeParams, resolveLocaleParam } from "@/lib/locale";

export function generateStaticParams() {
  return localeParams();
}

export default async function RootLayout({ params, children }) {
  const locale = resolveLocaleParam((await params).locale);
  return (
    <html lang={toLanguageTag(locale)}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
```

- `dynamicParams = false` is not allowed under `cacheComponents`; `resolveLocaleParam` is what 404s an unknown segment. Call it in every layout, page, and `generateMetadata` that reads `params.locale`.
- `<html lang>` and `hreflang` values are BCP 47. Keep only the primary language subtag (`PT_BR` + `BR` -> `pt-BR`, never `pt-br-BR`); the Chinese codes keep a script subtag so `ZH_CN` and `ZH_TW` for one country stay distinct. Throw when two locales produce the same tag.
- `LocaleProvider` is a client context so client components (and `LocalizedLink`, below) can read the locale without prop drilling.

---

## Proxy Rewrite

The public URL keeps whatever the routing type dictates; `proxy.ts` rewrites it into the `[locale]` shape after `handleShopifyRoutes` has had its turn:

```ts
// proxy.ts (after handleShopifyRoutes returns nothing)
const requestUrl = new URL(request.url);
const canonicalUrl = toCanonicalDefaultUrl(requestUrl, requestContext.locale, i18n);
if (canonicalUrl) return NextResponse.redirect(canonicalUrl, 308);

const requestHeaders = requestContext.getForwardedRequestHeaders();
const internalUrl = toLocaleSegmentUrl(requestUrl, requestContext.locale);
const response = internalUrl
  ? NextResponse.rewrite(internalUrl, { request: { headers: requestHeaders } })
  : NextResponse.next({ request: { headers: requestHeaders } });
requestContext.applyResponseHeaders(response.headers);
return response;
```

Rules the two helpers encode (keep them pure functions over `URL` so they are unit-testable without Next):

- Rewrite target: `/${getLocalePathSegment(requestContext.locale)}` followed by the path with `requestContext.locale.pathPrefix` stripped. `/products/x` -> `/en-us/products/x`; `fr.example.ca/products/x` -> `/fr-ca/products/x`; `/fr-ca/products/x` is already in shape.
- Pathname routing only: an explicit default prefix (`/en-us/...`) is not a locale match, so redirect it to the unprefixed URL. One canonical URL per page.
- Keep an explicit allowlist of root paths Next serves outside `[locale]` (`/robots.txt`, `/sitemap.xml`, your `public/` files, `/api/*` route handlers, `/.well-known/*`) and pass those through untouched; the proxy runs before `public/` is served. Do not infer "file" from an extension: a scanner hitting `/wp-login.php` would then reach the `[locale]` layout with a bogus param, and a root layout has nowhere to render a 404, so it 500s. Rewriting unknown paths sends them to the catch-all instead.
- The root layout resolves its shell locale leniently (default on an unknown segment) for the same reason; pages and `generateMetadata` resolve strictly and 404.
- `x-storefront-url` still carries the original browser URL, so dynamic components and `not-found.tsx` see the real request.
- Use `getLocalePathSegment(requestContext.locale)`, not a hand-built `${language}-${country}`: a matched locale carries `pathPrefix` in place of `pathSegment`, and the helper reads it so custom segments round-trip.

Domain routing depends on `request.url` carrying the real hostname. Hosting platforms that forward the host do this; a bare `next start` reports its own hostname, so test domain routing through the helper functions rather than `curl -H Host:`.

---

## Static Client Per Locale

Module-scope clients have no request URL. Create one per locale and pin `locale`; pages pass the plain locale object into `"use cache"` functions so it becomes part of the cache key:

```ts
// lib/storefront-static.ts
import "server-only";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  getLocalePathSegment,
  type ShopifyLocale,
} from "@shopify/hydrogen";

import { i18n } from "./config";

const clients = new Map<string, ReturnType<typeof createClient>>();

export function getStaticStorefrontClient(locale: ShopifyLocale = i18n.defaultLocale) {
  const key = getLocalePathSegment(locale);
  let client = clients.get(key);
  if (!client) {
    client = createClient(locale);
    clients.set(key, client);
  }
  return client;
}

function createClient(locale: ShopifyLocale) {
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

```tsx
// app/[locale]/products/[handle]/page.tsx
export default async function ProductPage({ params }) {
  const { locale: localeParam, handle } = await params;
  const locale = resolveLocaleParam(localeParam);
  const { product } = await fetchProduct(locale, handle);
  // ...
}

async function fetchProduct(locale: Locale, handle: string) {
  "use cache";
  return getStaticStorefrontClient(locale).graphql(PRODUCT_QUERY, { variables: { handle } });
}
```

Await `params` outside the cached function and pass the resolved value in. Passing the `params` promise into a `"use cache"` scope is what triggers "filling a cache during prerender timed out".

---

## Localized Links And Metadata

Write internal hrefs unprefixed and localize them at the edge with `getLocalizedHref`. A client `LocalizedLink` wrapping `next/link` reads the locale from `LocaleProvider`, so server and client components link the same way; the few raw `<a>`/`<form action>` elements in server components take `locale` as a prop.

```tsx
// components/LocalizedLink.tsx
"use client";
export function LocalizedLink({ href, ...props }) {
  const locale = useLocale();
  return <Link {...props} href={getLocalizedHref(href, { i18n, locale })} />;
}
```

Metadata: `alternates.canonical` is the localized absolute URL; `alternates.languages` maps each supported locale's BCP 47 tag to its URL (omit it for single-locale storefronts). The sitemap lists every path once per locale with the same alternates. `getLocalizedHref` returns a path under pathname routing and an absolute `https:` URL under domain routing, so resolve it against the trusted site origin before emitting.

---

## Per-Request Client

Personalized reads (cart seed, account state) are per-buyer, so they are dynamic anyway. Keep them behind `<Suspense>` and create the request context from `headers()` only; the forwarded `x-storefront-url` drives `requestContext.url` and the locale:

```ts
// lib/storefront.ts
export const getStorefrontClient = cache(async () => {
  const requestHeaders = await headers();
  const requestContext = createShopifyRequestContext({
    request: { headers: requestHeaders },
    i18n,
  });
  return createStorefrontClient({ type: "private", requestContext, config: { /* ... */ } });
});
```

Never build a synthetic `Request` with a fixed origin for these contexts: `request.url` wins over `x-storefront-url`, so every read would resolve the default locale.

---

## Unmatched URLs

With the root layout inside `[locale]`, Next has no static layout to compose a global `app/not-found.tsx` from. Add `app/[locale]/[...rest]/page.tsx` that calls `notFound()`; the proxy has already rewritten the URL into the segment, so it renders the locale's `not-found.tsx` inside the shell (and can run `handleShopifyRedirects` there). Under Cache Components that `notFound()` fires in a prerendered shell, so the response is `200` with `<meta name="robots" content="noindex">` rather than a `404` status, the same as `notFound()` from a product page. `experimental.globalNotFound` gives a true `404` instead, at the cost of an unlocalized static page that cannot run redirects.
