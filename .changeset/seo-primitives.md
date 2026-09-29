---
"@shopify/hydrogen": minor
---

Add framework-agnostic SEO primitives to `@shopify/hydrogen`. Every storefront needs structured data, canonical URLs, a sitemap, and a `robots.txt`, and until now each app re-wrote the same glue by hand.

**Structured data and URLs**

- `createProductJsonLd()`, `createBreadcrumbJsonLd()`, and `createOrganizationJsonLd()` build schema.org nodes from Storefront API data. Product nodes emit one `Offer` per variant, a single `Offer` for the selected variant, or an `AggregateOffer` from the price range.
- `serializeJsonLd()` serializes a node for a `<script type="application/ld+json">` element and escapes `<`, `>`, `&`, and Unicode line separators so a product description can never break out of the script.
- `getCanonicalUrl()` strips variant, filter, sort, cursor, and tracking params, normalizes the trailing slash, and swaps in a trusted origin so `Host` headers never leak into canonical tags.
- `getLanguageAlternates()` turns the current URL plus your locale list into `hreflang` alternates, including `x-default`.

**Sitemap and robots.txt request handlers**

- `createSitemapServerHandlers()` serves `/sitemap.xml` (an index with one child per Storefront API page) and `/sitemap/:type/:page.xml` for products, collections, pages, blogs, and opt-in articles and metaobjects. URLs follow your `routeTemplates`, every URL is repeated per locale with `xhtml:link` alternates when `locales` is set, and `staticPaths` adds app-owned pages.
- `createRobotsTxtServerHandlers()` and `createRobotsTxt()` produce Shopify's default crawl rules (admin, cart, checkout, orders, account, API, and filter/sort crawl traps disallowed, essentials repeated for `adsbot-google`) with paths derived from `routeTemplates`, a `Sitemap:` line, and a header that advertises the storefront's UCP/MCP endpoints to shopping agents.
- Register both with `handleShopifyRoutes({ handlers })` like the cart handlers. To support them, registered route handlers can now use template pathnames (`/sitemap/:type/:page.xml`, captured as `context.params`) and return `{ type: "response", response }` for non-JSON bodies.

```ts
import {
  createProductJsonLd,
  createRobotsTxtServerHandlers,
  createSitemapServerHandlers,
  getCanonicalUrl,
  serializeJsonLd,
} from "@shopify/hydrogen";

const sitemapHandlers = createSitemapServerHandlers({ routeTemplates, staticPaths: ["/"] });
const robotsHandlers = createRobotsTxtServerHandlers({ routeTemplates });
handleShopifyRoutes({ /* ... */, handlers: [cartHandlers, sitemapHandlers, robotsHandlers] });

const url = getCanonicalUrl(request.url, { origin: env.PUBLIC_SITE_ORIGIN });
const jsonLd = createProductJsonLd(product, { url, selectedVariant });
// React
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
```

A new `hydrogen-seo` packaged skill documents the patterns for coding agents.
