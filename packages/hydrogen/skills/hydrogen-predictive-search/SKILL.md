---
name: hydrogen-predictive-search
description: >
  Guide for building predictive search with @shopify/hydrogen. Use when adding,
  modifying, or reviewing autocomplete/search-as-you-type UI, predictive search
  route handlers, tracking URLs, custom predictive search fragments, or framework
  predictive search bindings.
---

# Hydrogen Predictive Search

Hydrogen predictive search has four layers:

1. Storefront API query helper in `@shopify/hydrogen`.
2. Same-origin route handler at `/api/predictive-search`.
3. Framework-neutral client store.
4. Framework provider/hooks or composables.

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

When building with a UI framework, check this skill's `references/` directory for framework-specific instructions. Framework bindings share the same route, store, and URL contracts.

## Tracking URLs

Use `getPredictiveSearchItemUrl()` for predictive result links. It infers Hydrogen's standard storefront route from the item's `__typename` and keeps Storefront API `trackingParameters` without double-encoding:

```tsx
import { getPredictiveSearchItemUrl } from "@shopify/hydrogen";

const productHref = getPredictiveSearchItemUrl(product, { routes: routeTemplates, term });
const querySuggestionHref = getPredictiveSearchItemUrl(querySuggestion, {
  routes: routeTemplates,
});
```

Pass `{term}` for resource items such as products, collections, pages, and articles. These items do not contain the shopper's typed search text, but the destination URL needs it for attribution. Do not pass `{term}` for `SearchQuerySuggestion` items; the helper uses `querySuggestion.text` automatically. Pass `{routes: routeTemplates}` so query suggestions honor a custom `search` route. Pass `{searchPath}` only when the suggestion link intentionally differs from the shared search route; it takes precedence when provided.

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
- **Degrade to a normal search without JavaScript.** The search entry point must be a real `/search` link or a `role="search"` GET form, and the predictive modal's form must submit `GET /search` natively (`formProps()` defaults to this). Predictive autocomplete is an enhancement layered on top — never the only way to reach search results. With JS off, the trigger navigates to `/search` (or submits the term to it) and the full search page renders results server-side.
- Keep UI rendering and layout app-owned.
- Preserve `trackingParameters` on every predictive result link.
- Use `q` for the search term so predictive and full search URLs align.
- Use the local `hydrogen-routing` skill for result URLs when the app uses custom Shopify resource paths.
- Render store errors near the search UI.
- Keep debounce in the client store; do not add ad-hoc debounce in components unless there is a separate UX reason.
- Prefer additive fragments over full query overrides.
- Return empty UI for blank terms rather than querying Storefront API.
- The modal is a native `<dialog>` opened with `showModal()`. For backdrop-dismiss, use `closedby="any"` where supported. For browsers without `closedby` support, use a pointerdown-plus-click guard: record whether `pointerdown` started on the dialog backdrop, then close only when the following `click` also targets the dialog. Do not close on a plain `click.self` alone — a drag that starts inside and ends on the backdrop can produce an accidental close.

## Verify

Done when:

- [ ] Search works without JavaScript: a real `/search` link or `role="search"` GET form reaches server-rendered results, and the predictive modal's form submits `GET /search` natively.
- [ ] Browser autocomplete goes through the same-origin `/api/predictive-search` route.
- [ ] Every predictive result link preserves `trackingParameters` (built with `getPredictiveSearchItemUrl()`).
- [ ] Blank terms render empty UI without querying the Storefront API.
- [ ] Store errors surface near the search UI.
- [ ] The search term uses `q` so predictive and full search URLs align.

## Anti-patterns

- Gating search behind JavaScript — a search trigger that only opens a JS autocomplete overlay, with no `/search` link or native GET form underneath, leaves no-JS shoppers with no way to search. The predictive layer must enhance a working `/search` path, not replace it.
- Calling Storefront API directly from browser UI when a same-origin route can proxy the request.
- Reusing `/search?predictive=true` as the autocomplete API when `/api/predictive-search` is available.
- Dropping or manually concatenating tracking parameters.
- Hard-coding predictive result links separately from the app's routing primitive.
- Duplicating predictive search state in framework component state when the Hydrogen store already owns request lifecycle, debounce, aborts, and stale response handling.
- Shipping a visual autocomplete component as the primary abstraction.
