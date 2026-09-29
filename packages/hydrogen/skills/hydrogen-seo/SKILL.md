---
name: hydrogen-seo
description: >
  Guide for canonical URLs, hreflang alternates, and schema.org JSON-LD in
  Hydrogen storefronts. Use when building product, collection, search, or
  root layouts, adding structured data, or fixing duplicate-URL and
  Merchant Center structured data warnings.
---

# SEO Primitives

Use Hydrogen's SEO helpers instead of hand-rolling JSON-LD objects, canonical
strings, or `JSON.stringify` inside `<script>` tags.

```ts
import {
  createBreadcrumbJsonLd,
  createOrganizationJsonLd,
  createProductJsonLd,
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

## Anti-Patterns

- `JSON.stringify(jsonLd)` inside `<script>` without escaping.
- `<script type="application/ld+json">{JSON.stringify(jsonLd)}</script>` as a React child.
- Canonical URLs built from `new URL(request.url).origin` in production.
- A canonical that keeps `?Color=Red` or `?variant=123`.
- `price: formatMoney(variant.price)` in an `Offer`.
