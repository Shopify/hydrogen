---
'@shopify/hydrogen': minor
---

Resolve inbound `?variant=<id>` deep links to the product URL's option-param form.

Shopify's own surfaces — Liquid storefronts, Shopping feeds, email campaigns, paid ads, and Shop Pay — deep-link to a product with a bare variant id (`/products/shoes?variant=41565182099480`) rather than one search param per option. A storefront that only reads option params (`?Color=Red&Size=M`) silently drops that selection and renders the default variant, so every link a merchant already has in market lands on the wrong variant after migrating to Hydrogen.

Two new exports:

- `getVariantIdParam({ searchParams })` reads the param and normalizes it to a `ProductVariant` GID, returning `null` for anything that isn't one — including GIDs for other resource types, so an untrusted param can't be forwarded into a `node(id:)` lookup for an unrelated object.
- `handleVariantDeepLink({ request, storefrontClient, routeTemplates, pathPrefix })` resolves the variant and returns a 307 `Response`, or `null` when the request isn't a product URL with a resolvable variant. It mirrors the `handleUrlRedirects` interceptor shape, so it drops into any framework's pre-render hook.

```ts
const variantRedirect = await handleVariantDeepLink({ request, storefrontClient, routeTemplates });
if (variantRedirect) return variantRedirect;
```

Because it goes through `routeTemplates`, apps serving products from a custom path (`/p/:productHandle`) and apps using an i18n `pathPrefix` (`/en-ca/products/…`) work without extra configuration. The redirect preserves unrelated params (`utm_*`, `ref`) so campaign attribution survives, and follows the variant's own product handle so a combined-listing variant lands on the right page.

This is additive: option params remain the canonical URL contract and remain the no-JS mechanism. Unresolvable or stale ids return `null` and render the default variant rather than 404.

Run it before the route renders, not after a 404 like `handleShopifyRedirects` — the product route exists, and only the variant selection needs translating. Running it during rendering can degrade to a client-side redirect that never fires for a shopper with JavaScript disabled.
