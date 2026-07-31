---
name: hydrogen-collection-browser
description: >
  Guide for building collection and search browsing UI with @shopify/hydrogen.
  Use when creating, modifying, or reviewing collection routes, search results,
  product grids, filters, sort controls, active filter chips, or URL-synced
  browse state in storefront frameworks.
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

Before building UI, check whether this skill has a reference file for the app's framework in `references/`. If one exists, read it and use that framework binding or route pattern first.

If there is no matching reference, use `createCollectionStore` plus the `parseCollectionParams`/`serializeCollectionParams`/`getFilterRemovalUrl`/`isFilterInputActive` helpers from `@shopify/hydrogen` directly, and apply the UI and search rules below with the framework's own form, route, and reactivity primitives.

## Data Contract

Server data should include:

- Collection/search identity: collection `handle`, or `search:${term}` for search pages.
- `dataSearch`: the exact search string used for the server query.
- `products`: Storefront API product nodes shaped for the product card.
- `availableFilters`: normalized filter metadata from `products.filters` or `search.productFilters`.
- Optional `totalCount` and `pageInfo` for search or pagination UI.

Use `parseCollectionParams(searchParams)` before Storefront API queries. Pass parsed `filters`, `sortKey`, and `reverse` into `collection.products(...)` or `search(...)`.

## UI Rules

- Use the framework binding when a matching reference exists. Otherwise, use the core store directly. Do not hand-roll browse state with component state.
- The browse form must carry both `method="get"` **and** an explicit `action` (the collection/search route URL, e.g. `action="/collections/shoes"` or the search route) so filters and sort degrade to a real GET submit without JavaScript. `formProps()` only wires the submit handler — it does not set `method` or `action` — so render both literally; the helper cannot infer the route.
- Use `formProps()` on the browse form: spread it, then add the literal `method="get"` and `action`. On hydrated changes, call `form.requestSubmit()` for **checkboxes and `<select>`**. For **text/number inputs (price min/max)** use `onBlur` + `onKeyDown` Enter instead — `onChange` fires per keystroke and would submit the GET form (and re-query Storefront) on every character.
- Render a `noscript` submit button for filter sidebars that auto-submit when hydrated.
- Render "load more" / pagination as a GET link (the framework's link component) carrying the next-page cursor (e.g. `?after=<endCursor>`), so it works without JavaScript. Hydration may upgrade it to append-in-place; the bare link must still load the next page server-side (it replaces the page rather than appending when JS is off).
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
- Map unsupported search sorts back to `RELEVANCE`; only `PRICE` uses `reverse`.
- Empty search terms should return an empty product list and no filters rather than querying Storefront API.
- The search input is uncontrolled (`defaultValue={term}`) so the no-JS GET submit works; add `key={term}` so navigation (e.g. "Clear search" → `/search`) resets it. Safe because `term` changes only on submit/navigation, not while typing — do **not** put `key={term}` on a controlled input that updates the term per keystroke (focus loss).

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
- With JavaScript disabled, the load-more / pagination link loads the next page server-side.
- Active filter chips remove only one filter and preserve unrelated params.
- Search filters preserve `q`.
- Back/forward navigation settles loading state.
