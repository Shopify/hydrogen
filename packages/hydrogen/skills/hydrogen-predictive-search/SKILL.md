---
name: hydrogen-predictive-search
description: >
  Guide for building predictive search with @shopify/hydrogen. Use when adding,
  modifying, or reviewing autocomplete/search-as-you-type UI, predictive search
  route handlers, tracking URLs, custom predictive search fragments, or React
  predictive search bindings.
---

# Hydrogen Predictive Search

Hydrogen predictive search has four layers:

1. Storefront API query helper in `@shopify/hydrogen`.
2. Same-origin route handler at `/api/predictive-search`.
3. Framework-neutral client store.
4. React provider/hooks in `@shopify/hydrogen/react`.

Keep rendering app-owned. Hydrogen provides data, state, request lifecycle, and URL helpers — not a dropdown template.

## Server Route

Register the packaged route handler in the app's central `handleShopifyRoutes()` wiring before framework routing. Use the `hydrogen-request-handlers` skill for the full framework-specific request context, session manager, and Storefront client setup.

```ts
import { createPredictiveSearchServerHandlers } from "@shopify/hydrogen";

const predictiveSearchHandlers = createPredictiveSearchServerHandlers();
```

Use the same request-scoped Storefront client as the app's other Hydrogen handlers and loaders. Do not create a second client inside predictive search code.

The default browser predictive search endpoint is `GET /api/predictive-search`. Override it with `predictiveSearchEndpoint` when the JSON route lives elsewhere. The route accepts `q` plus optional Storefront API controls such as `limit`, `limitScope`, `types`, `searchableFields`, and `unavailableProducts`.

## Framework UI

Read the relevant framework reference before implementing predictive search UI. For React provider and hook usage, see `references/react.md`.

## Tracking URLs

Use `getPredictiveSearchItemUrl()` for predictive result links. It infers Hydrogen's standard storefront route from the item's `__typename` and keeps Storefront API `trackingParameters` without double-encoding:

```tsx
import { getPredictiveSearchItemUrl } from "@shopify/hydrogen";

const productHref = getPredictiveSearchItemUrl(product, { routes: routeTemplates, term });
const querySuggestionHref = getPredictiveSearchItemUrl(querySuggestion);
```

Pass `{term}` for resource items such as products, collections, pages, and articles. These items do not contain the shopper's typed search text, but the destination URL needs it for attribution. Do not pass `{term}` for `SearchQuerySuggestion` items; the helper uses `querySuggestion.text` automatically. Pass `{searchPath}` for query suggestions only when the full search page is not `/search`.

If the storefront uses custom Shopify resource paths, use the local `hydrogen-routing` skill before wiring predictive search result URLs. Do not create predictive-search-only URL callbacks.

Use `getSearchResultUrl()` only when constructing a custom search-attributed URL that is not backed by a predictive search item.

Do not publish a new analytics event for predictive suggestions. Full search pages can keep their existing search-view analytics; predictive result links carry attribution through tracking parameters.

## Custom Fragments

Use additive fragments when the UI needs extra result fields:

```ts
import {
  createPredictiveSearchServerHandlers,
  gql,
  makePredictiveSearchQueries,
  queryPredictiveSearch,
} from "@shopify/hydrogen";

const predictiveSearchFragments = {
  product: gql(`
    fragment PredictiveSearchProductFragment on Product {
      vendor
    }
  `),
};

const predictiveSearchHandlers = createPredictiveSearchServerHandlers({
  fragments: predictiveSearchFragments,
});

const queries = makePredictiveSearchQueries({
  fragments: predictiveSearchFragments,
});

const data = await queryPredictiveSearch({
  storefrontClient,
  term,
  query: queries.predictiveSearch,
});
```

Use the route-handler form for browser-backed autocomplete. Use `makePredictiveSearchQueries()` when querying directly from server code. Keep fragment names as documented by the API types. Hydrogen composes these with required base fields such as IDs, handles, titles, prices, images, and tracking parameters.

## Rules

- Use the packaged route handler as the default browser transport.
- Keep UI rendering and layout app-owned.
- Preserve `trackingParameters` on every predictive result link.
- Use `q` for the search term so predictive and full search URLs align.
- Use the local `hydrogen-routing` skill for result URLs when the app uses custom Shopify resource paths.
- Render store errors near the search UI.
- Keep debounce in the client store; do not add ad-hoc debounce in components unless there is a separate UX reason.
- Prefer additive fragments over full query overrides.
- Return empty UI for blank terms rather than querying Storefront API.

## Anti-patterns

- Calling Storefront API directly from browser UI when a same-origin route can proxy the request.
- Reusing `/search?predictive=true` as the autocomplete API when `/api/predictive-search` is available.
- Dropping or manually concatenating tracking parameters.
- Hard-coding predictive result links separately from the app's routing primitive.
- Duplicating predictive search state in React component state when the Hydrogen store already owns request lifecycle, debounce, aborts, and stale response handling.
- Shipping a visual autocomplete component as the primary abstraction.
