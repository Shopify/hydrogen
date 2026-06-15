---
name: hydrogen-collection-browser
description: >
  Guide for building collection and search browsing UI with @shopify/hydrogen.
  Use when creating, modifying, or reviewing collection routes, search results,
  product grids, filters, sort controls, active filter chips, or URL-synced
  browse state in React, Next.js, Vue, or Nuxt storefronts.
---

# Collection And Search Browsing

Hydrogen's collection primitive manages browse intent: filters, sort, URL params, and loading status. It does not own product data. The framework loader/server component owns Storefront API queries and passes products plus available filters into UI.

Use this skill for:

- `/collections`, `/collections/:handle`, and `/search` routes.
- Product grid filtering and sorting.
- Active filter chips and clear links.
- No-JS GET form fallbacks for filters and sort.
- Search-result pages that reuse collection browse state.

## Framework References

Read the reference that matches the app:

- React Router or generic React route loaders: `references/react.md`.
- Next.js App Router: `references/nextjs.md`.
- Nuxt or Vue route pages: `references/nuxt.md`.
- No packaged binding (SvelteKit, SolidStart, vanilla JS, etc.): use `createCollectionStore` plus the `parseCollectionParams`/`serializeCollectionParams`/`getFilterRemovalUrl`/`isFilterInputActive` helpers from `@shopify/hydrogen` directly, and apply the UI and search rules below with the framework's own form and reactivity primitives.
- Astro: use the binding for the island's UI framework — React or Vue islands use the references above; Svelte/Solid/vanilla islands use the core store directly.

## Data Contract

Server data should include:

- Collection/search identity: collection `handle`, or `search:${term}` for search pages.
- `dataSearch`: the exact search string used for the server query.
- `products`: Storefront API product nodes shaped for the product card.
- `availableFilters`: normalized filter metadata from `products.filters` or `search.productFilters`.
- Optional `totalCount` and `pageInfo` for search or pagination UI.

Use `parseCollectionParams(searchParams)` before Storefront API queries. Pass parsed `filters`, `sortKey`, and `reverse` into `collection.products(...)` or `search(...)`.

## UI Rules

- Use `CollectionProvider`, `useCollection`, and `useCollectionForm` from the framework binding. Do not hand-roll browse state with component state.
- Forms use `method="get"` so filters and sort work without JavaScript.
- Use `formProps()` on the browse form. On hydrated input/select changes, call `form.requestSubmit()`.
- Render a `noscript` submit button for filter sidebars that auto-submit when hydrated.
- Show stale products with a pending visual state while `state.status === "loading"`; do not replace the grid with a skeleton.
- Serialize active filter chips from `serializeCollectionParams(state)` and remove filters with `getFilterRemovalUrl(...)`.
- Use `isFilterInputActive(state.filters, value.input)` to mark checked filter inputs.
- Treat each Storefront API `FilterValue.input` JSON string as the authoritative filter identity. To render one checkbox, parse that JSON into a `ProductFilter`, wrap it as `{ filters: [filter], sortKey: undefined, reverse: false }`, and pass it to `serializeCollectionParams(...)` for the field name/value. Do not derive filter shapes or param names from filter IDs, labels, or types.
- Build sort option values with `getSortByValue(...)`; it emits the Liquid-compatible `sort_by` strings that `parseCollectionParams()` understands.
- Treat availability and other single-choice filters as mutually exclusive when the Storefront filter input serializes to the same param name.

## Search Rules

- Keep the search term in `q`.
- Use a collection handle like `search:${term}` so a new term rebuilds the browse store and does not carry old filters.
- Keep `q` as a hidden input inside the filter/sort form.
- Map unsupported search sorts back to `RELEVANCE`; only `PRICE` uses `reverse` in the current examples.
- Empty search terms should return an empty product list and no filters rather than querying Storefront API.

## Anti-Patterns

- Do not use router query objects when filter param names contain dots, unless the framework preserves dotted keys literally.
- Do not compute filter URLs manually when Hydrogen helpers can serialize/remove filters.
- Do not write a custom mapping table from `ProductFilter` shapes to URL params. `serializeCollectionParams(...)` already maps supported shapes such as `available`, `productType`, `productVendor`, `tag`, `variantOption`, product metafields, variant metafields, and price into Liquid-compatible params.
- Do not synthesize Storefront API `ProductFilter` objects from display metadata. `value.input` already contains the supported filter shape.
- Do not store products in the collection store; products come from the framework data response.
- Do not clear non-filter params such as `q`, campaign params, or variant params unless the route explicitly owns them.

## Verify

- Filtering and sorting update the URL without scroll reset when hydrated.
- Reloading the filtered URL server-renders the same filtered state.
- With JavaScript disabled, checking filters and submitting the form loads the filtered URL.
- Active filter chips remove only one filter and preserve unrelated params.
- Search filters preserve `q`.
- Back/forward navigation settles loading state.
