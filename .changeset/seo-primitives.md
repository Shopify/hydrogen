---
"@shopify/hydrogen": minor
---

Add framework-agnostic SEO primitives to `@shopify/hydrogen`. Every storefront needs structured data and canonical URLs, and until now each app re-wrote the same glue by hand.

- `createProductJsonLd()`, `createBreadcrumbJsonLd()`, and `createOrganizationJsonLd()` build schema.org nodes from Storefront API data. Product nodes emit one `Offer` per variant, a single `Offer` for the selected variant, or an `AggregateOffer` from the price range.
- `serializeJsonLd()` serializes a node for a `<script type="application/ld+json">` element and escapes `<`, `>`, `&`, and Unicode line separators so a product description can never break out of the script.
- `getCanonicalUrl()` strips variant, filter, sort, cursor, and tracking params, normalizes the trailing slash, and swaps in a trusted origin so `Host` headers never leak into canonical tags.
- `getLanguageAlternates()` turns the current URL plus your locale list into `hreflang` alternates, including `x-default`.

```ts
import { createProductJsonLd, getCanonicalUrl, serializeJsonLd } from "@shopify/hydrogen";

const url = getCanonicalUrl(request.url, { origin: env.PUBLIC_SITE_ORIGIN });
const jsonLd = createProductJsonLd(product, { url, selectedVariant });

// React
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
```
