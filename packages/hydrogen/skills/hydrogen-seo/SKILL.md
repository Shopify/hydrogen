---
name: hydrogen-seo
description: >
  Guide for canonical URLs, hreflang alternates, schema.org JSON-LD, XML
  sitemaps, and robots.txt in Hydrogen storefronts. Use when building product,
  collection, search, or root layouts, adding structured data, wiring
  /sitemap.xml or /robots.txt, or fixing duplicate-URL, Search Console, and
  Merchant Center warnings.
---

# SEO Primitives

Use Hydrogen's SEO helpers instead of hand-rolling JSON-LD objects, canonical
strings, `JSON.stringify` inside `<script>` tags, or per-framework sitemap and
robots routes.

```ts
import {
  createBreadcrumbJsonLd,
  createOrganizationJsonLd,
  createProductJsonLd,
  createRobotsTxtServerHandlers,
  createSitemapServerHandlers,
  getCanonicalUrl,
  getLanguageAlternates,
  serializeJsonLd,
} from "@shopify/hydrogen";
```

## Rules

- **Canonical origin comes from a trusted env var**, never from `Host` or
  `X-Forwarded-Host`. Read `PUBLIC_SITE_ORIGIN` (or the framework equivalent)
  once and pass it as `origin` to every helper.
- **One canonical per resource.** `getCanonicalUrl()` drops variant options,
  filters, sort keys, cursors, and tracking params by default. Only keep a
  param with `keepSearchParams` when it changes the primary content, such as
  `q` on the search page.
- **Always serialize with `serializeJsonLd()`** and render the string as raw
  HTML. A product description containing `</script>` otherwise ends the script
  element early. Never pass JSON as a text child of `<script>` in React; the
  quotes get HTML-escaped and the JSON becomes invalid.
- **Product JSON-LD goes on the PDP only**, built from the same product query
  the page renders. Pass `selectedVariant` for a single `Offer`, or `variants`
  for one `Offer` per variant. Do not build `Offer` price fields from
  `formatMoney()` output; pass the raw `MoneyV2`.
- **Breadcrumbs and Organization are shared components.** Build them once and
  reuse across routes. Do not copy a `BreadcrumbJsonLd` function per route.
- **hreflang lists every locale including the current one** and should be
  emitted from the same locale list that drives your i18n `pathPrefix`.
- **Sitemaps and robots.txt are request handlers, not route files.** Register
  `createSitemapServerHandlers()` and `createRobotsTxtServerHandlers()` with
  `handleShopifyRoutes({ handlers })` next to the cart handlers (see the local
  `hydrogen-request-handlers` skill). Delete any framework `sitemap` or
  `robots` route the app carried over; the handlers short-circuit before
  framework routing, so a leftover route is dead code.
- **Pass the same `routeTemplates` everywhere.** The sitemap builds resource
  URLs from them and robots.txt derives its disallow list from them, so custom
  cart, search, collection, or blog paths stay consistent.

## Canonical URL

```ts
// route loader / server component
const canonical = getCanonicalUrl(request.url, { origin: env.PUBLIC_SITE_ORIGIN });
```

Render it as `<link rel="canonical" href={canonical} />` (React Router
`meta()` supports `{ tagName: "link", rel: "canonical", href }`; Next.js uses
`alternates.canonical` in `generateMetadata`).

## hreflang

```ts
const alternates = getLanguageAlternates(request.url, {
  origin: env.PUBLIC_SITE_ORIGIN,
  currentPathPrefix: i18n.pathPrefix,
  locales: [
    { hrefLang: "en-US" },
    { hrefLang: "fr-CA", pathPrefix: "/fr-ca" },
  ],
  xDefault: "en-US",
});
// -> [{ hrefLang, href }] for <link rel="alternate" hreflang href>
```

## Product JSON-LD

```tsx
const url = getCanonicalUrl(request.url, { origin });
const jsonLd = createProductJsonLd(product, {
  url,
  selectedVariant,
  getVariantUrl: (variant) =>
    `${url}?${buildProductSelectionSearchParams(variant.selectedOptions)}`,
});

<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
```

`product` needs `title`, and benefits from `description`, `vendor`,
`productType`, `images`, and `priceRange`. Variants need `availableForSale`,
`price`, and ideally `sku` and `image`.

## Breadcrumbs and Organization

```ts
createBreadcrumbJsonLd([
  { name: "Home", url: `${origin}/` },
  { name: "Collections", url: `${origin}/collections` },
  { name: collection.title }, // current page: no url
]);

createOrganizationJsonLd({ name: shop.name, url: origin, logo: shop.brand?.logo?.image?.url });
```

Emit Organization once from the root layout. Emit a BreadcrumbList on every
page below the home page.

## Sitemap and robots.txt

```ts
// app/lib/seo.ts (server)
export const sitemapHandlers = createSitemapServerHandlers({
  origin: env.PUBLIC_SITE_ORIGIN, // omit in dev to use the request origin
  routeTemplates,
  staticPaths: ["/", "/collections"],
  // locales: [{ hrefLang: "en-US" }, { hrefLang: "fr-CA", pathPrefix: "/fr-ca" }],
});

export const robotsHandlers = createRobotsTxtServerHandlers({
  origin: env.PUBLIC_SITE_ORIGIN,
  routeTemplates,
});

// request middleware
handleShopifyRoutes({ ..., handlers: [cartHandlers, sitemapHandlers, robotsHandlers] });
```

What you get:

- `GET /sitemap.xml` lists one child sitemap per Storefront API page (up to
  250 URLs each) for products, collections, pages, and blogs, plus
  `/sitemap/static/1.xml` for `staticPaths`.
- `GET /sitemap/:type/:page.xml` renders that page with `<lastmod>`. With
  `locales`, every URL is repeated per locale with `xhtml:link` alternates.
- `GET /robots.txt` allows everything public, disallows admin, cart, checkout,
  orders, account, API, and filter/sort crawl traps, repeats the essentials for
  `adsbot-google`, points at the sitemap, and advertises the storefront's
  UCP/MCP endpoints to shopping agents.
- Responses carry `Cache-Control: public, max-age=3600, stale-while-revalidate=82800`
  by default (`cache` option). Pass `cache` only when the Storefront client was
  created with a `cache` instance if you also want the queries cached.

Rules:

- `articles` are opt-in and need `getResourceUrl`: the Storefront API sitemap
  returns article handles without their blog handle. Return the app's article
  pathname, for example `` `/blogs/news/${resource.handle}` ``, or `null` to skip.
- `metaobjects` are opt-in and default to `/<onlineStoreUrlHandle>/<handle>`.
  Include them only when the app renders metaobject pages.
- Use `getResourceUrl` to drop resources the app does not render (return `null`),
  never to rewrite the origin; set `origin` for that.
- Add crawl-delay or bot-specific groups with `additionalGroups`; add
  app-specific private paths with `disallow`.

## Anti-Patterns

- `JSON.stringify(jsonLd)` inside `<script>` without escaping.
- `<script type="application/ld+json">{JSON.stringify(jsonLd)}</script>` as a React child.
- Canonical URLs built from `new URL(request.url).origin` in production.
- A canonical that keeps `?Color=Red` or `?variant=123`.
- `price: formatMoney(variant.price)` in an `Offer`.
- A framework `sitemap.ts`/`robots.ts` route next to registered sitemap handlers.
- Building `<loc>` values with string concatenation instead of the handlers'
  `routeTemplates` (custom paths silently drift).
