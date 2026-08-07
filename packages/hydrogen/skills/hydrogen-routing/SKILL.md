---
name: hydrogen-routing
description: >
  Guide for Hydrogen route templates and Shopify storefront URL routing. Use when
  adding, modifying, or reviewing createShopifyRouteTemplates, routeTemplates,
  custom Shopify resource or utility-page paths, standard route redirects,
  ShopifyScripts routes, or predictive search result URLs.
---

# Hydrogen Routing

Hydrogen route templates describe the app's URL shape for Shopify standard storefront routes. They are shared configuration, not page handlers.

Create one route template manifest during app setup. It can be empty when the app uses Shopify's default storefront paths, but it should still be passed to Hydrogen primitives so there is one app-owned routing manifest to update if routes change later.

Routing is owned by the host framework and the app's router. Before deciding whether a template is needed, identify the framework, inspect how it declares routes, and verify which resolved path pattern actually renders each Shopify resource or utility page. Do not infer route support from filenames alone when the framework uses route config, middleware, rewrites, catch-all routes, or localized route groups.

Only add template keys for Shopify standard routes the app actually handles or intentionally canonicalizes. If the app does not render Shopify pages, does not have a blog, or does not support another route type, leave that key undefined so the route can remain a normal 404.

## Core Primitive

Create one `routeTemplates` object and pass the same object to every Hydrogen primitive that builds, redirects, or exposes Shopify storefront URLs:

```ts
import { createShopifyRouteTemplates } from "@shopify/hydrogen";

export const routeTemplates = createShopifyRouteTemplates({
  product: "/p/:productHandle",
  collection: "/c/:collectionHandle",
  article: "/journal/:blogHandle/:articleHandle",
  cart: "/basket",
  policy: "/legal/:policyHandle",
  search: "/find",
});
```

If the app currently uses Shopify's default resource paths, create an empty manifest with an explanatory comment:

```ts
// Shopify standard storefront routes are currently handled at their default paths.
// Add entries here if the app changes to custom Shopify resource or utility-page paths.
export const routeTemplates = createShopifyRouteTemplates({});
```

Each key is a Shopify standard route identity. Each value is the app's custom pathname template for that identity. Templates must start with `/` and include the required named placeholders for that key. Add a key only when the app handles that route at a non-standard pathname, or when the app intentionally canonicalizes a standard Shopify variant such as `productInCollection`.

## Shopify Standard Storefront Routes

Before adding a template key, inspect the app's router and compare its resolved paths to Shopify's standard storefront paths. For file-system routers, translate the framework's filename syntax into URL patterns. For config-based routers, read the route config. For middleware, rewrites, catch-all routes, and localized route groups, trace how the request path is normalized before it reaches the route.

- `product`: Shopify standard path `/products/:productHandle`. Add this key only when the app renders product detail pages at a different path, such as `/p/:productHandle` or `/shop/:productHandle`. Leave it undefined when the app already handles `/products/:productHandle`.
- `productInCollection`: Shopify standard path `/collections/:collectionHandle/products/:productHandle`. Add this key when the app should canonicalize collection-scoped product URLs to a product page it handles, such as `/products/:productHandle`, or to a custom collection-scoped product path, such as `/c/:collectionHandle/p/:productHandle`. Leave it undefined if collection-scoped product URLs should 404.
- `collection`: Shopify standard path `/collections/:collectionHandle`. Add this key only when the app renders collection detail pages at a different path, such as `/c/:collectionHandle` or `/shop/collections/:collectionHandle`. Leave it undefined when the app does not render collections.
- `collectionList`: Shopify standard paths `/collections` and legacy `/products`. Add this key only when the app renders the collection listing at a different path, such as `/catalog`. Leave it undefined when the app handles `/collections` or does not render a collection listing.
- `page`: Shopify standard path `/pages/:pageHandle`. Add this key only when the app renders Shopify Online Store pages at a different path, such as `/content/:pageHandle` or `/info/:pageHandle`. Leave it undefined when the app does not render Shopify pages.
- `policy`: Shopify standard path `/policies/:policyHandle`. Add this key only when the app renders Shopify policies at a different path, such as `/legal/:policyHandle`. Leave it undefined when the app handles `/policies/:policyHandle` or does not render policy pages.
- `blog`: Shopify standard path `/blogs/:blogHandle`. Add this key only when the app renders blog landing/listing pages at a different path, such as `/journal/:blogHandle` or `/articles/:blogHandle`. Leave it undefined when the app does not render blogs.
- `article`: Shopify standard path `/blogs/:blogHandle/:articleHandle`. Add this key only when the app renders blog articles at a different path, such as `/journal/:blogHandle/:articleHandle` or `/articles/:blogHandle/:articleHandle`. Leave it undefined when the app does not render articles.
- `cart`: Shopify standard path `/cart`. Add this key only when the app renders the full cart page at a different path, such as `/basket`. Leave it undefined when the app handles `/cart` or has no full cart page.
- `search`: Shopify standard path `/search`. Add this key only when the app renders full search results at a different path, such as `/find`. Leave it undefined when the app handles `/search` or has no full search page.

Supported placeholders are `:productHandle`, `:collectionHandle`, `:pageHandle`, `:policyHandle`, `:blogHandle`, and `:articleHandle`. Do not use extra dynamic placeholders such as `:selectedOptions`; Hydrogen cannot infer or pass values for placeholders outside the supported handle set.

## Required Consumers

Pass the same `routeTemplates` object to all relevant Hydrogen primitives, even when it is empty.

### Redirects

Pass `routeTemplates` to `handleShopifyRedirects()` so Shopify's default storefront paths redirect to the app's custom paths after the framework returns a 404:

```ts
const redirect = await handleShopifyRedirects({
  request,
  storefrontClient,
  routeTemplates,
});
```

Only run `handleShopifyRedirects()` after framework routing has produced a 404. Do not use route templates to preempt normal app routes.

### ShopifyScripts

Pass route templates to `ShopifyScripts` so browser-side Shopify modules and agent tools can resolve Shopify storefront URLs through the app's URL shape after hydration:

```tsx
<ShopifyScripts
  shop={shop}
  i18n={i18n}
  routes={routeTemplates}
/>
```

For non-component integrations, render `getShopifyScriptTags()` or `renderShopifyScriptTags()` during SSR, then pass the same `routes: routeTemplates` option to `initializeShopifyScripts()` during browser hydration.

### Predictive Search

Pass route templates to `getPredictiveSearchItemUrl()` so predictive result links match the app's custom resource paths while preserving Shopify tracking parameters:

```ts
const href = getPredictiveSearchItemUrl(item, {
  term,
  routes: routeTemplates,
  pathPrefix: i18n.pathPrefix,
});
```

Predictive search falls back to Shopify's default routes when a template key is omitted from the manifest.

For query suggestions, pass the same route templates so a custom `search` route is used. Pass `searchPath` only when that link intentionally differs from the shared search route; an explicit `searchPath` takes precedence.

## Markets And Path Prefixes

Do not include locale or market prefixes in route template values. Keep templates resource-relative:

```ts
createShopifyRouteTemplates({
  product: "/p/:productHandle",
});
```

not:

```ts
createShopifyRouteTemplates({
  product: "/en-us/p/:productHandle",
});
```

Hydrogen applies `i18n.pathPrefix` separately:

- `handleShopifyRedirects()` reads it from `storefrontClient.requestContext.i18n.pathPrefix`.
- `ShopifyScripts` receives it through the `i18n` prop or option.
- `getPredictiveSearchItemUrl()` receives it through `pathPrefix`.

## Rules

- Identify the framework and router before deciding which Shopify standard routes are handled.
- Inspect the app's actual route files before adding a template key.
- Create one `routeTemplates` manifest, even when it is empty.
- Add only keys whose Shopify route is rendered at a non-standard pathname.
- Reuse one `routeTemplates` object across redirects, ShopifyScripts, and predictive search.
- Keep route templates serializable. Use strings, not callback functions.
- Do not query Shopify to verify resource existence before redirecting a standard route. Redirect to the app route and let that route handle missing resources.
- Do not include query strings or hashes in route templates. Consumers preserve or append query parameters separately.
- Do not include i18n path prefixes in templates.

## Anti-patterns

- Passing route templates to `handleShopifyRedirects()` but not `ShopifyScripts`.
- Hard-coding predictive search links separately from `routeTemplates`.
- Creating different template objects for different Hydrogen routing consumers.
- Using callback URL builders for standard Shopify resources when a route template can describe the URL shape.
- Adding templates for default paths just to be explicit; keep the manifest empty or omit those keys instead.
