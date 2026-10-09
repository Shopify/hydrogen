---
name: hydrogen-collection-browser
description: >
  Guide for building collection and search browsing UI with @shopify/hydrogen.
  Use when creating, modifying, or reviewing collection routes, search results,
  product grids, filters, sort controls, active filter chips, or URL-synced
  browse state in storefront frameworks.
metadata:
  source: "@shopify/hydrogen"
  version: "2026.10.0"
  hash: "sha256:2a4ed3e893d1bda96e3ba96b00a6a0444cdff78694248147772d2deec2b12896"
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
- `currencyCode` for `PRICE_RANGE` inputs, loaded by the same query as the products so it matches product prices: `localization.country.currency.isoCode` under `@inContext` in market-aware stores, or `shop.paymentSettings.currencyCode` in single-currency stores.
- Optional `totalCount` and `pageInfo` for search or pagination UI.

Use `parseCollectionParams(searchParams)` before Storefront API queries. Pass parsed `filters`, `sortKey`, and `reverse` into `collection.products(...)` or `search(...)`.

## UI Rules

- Use the framework binding when a matching reference exists. Otherwise, use the core store directly. Do not hand-roll browse state with component state.
- The browse form must carry both `method="get"` **and** an explicit `action` (the collection/search route URL, e.g. `action="/collections/shoes"` or the search route) so filters and sort degrade to a real GET submit without JavaScript. `formProps()` only wires the submit handler — it does not set `method` or `action` — so render both literally; the helper cannot infer the route.
- Choose controls at the filter-group level: `PRICE_RANGE` renders min/max number inputs; `LIST` and `BOOLEAN` render value checkboxes. A price value serializes to two params, so never use the number of serialized entries to decide whether to render the group. Use the fixed `filter.v.price.gte` and `filter.v.price.lte` names for range inputs; continue deriving checkbox names and values from `value.input`.
- Use `formProps()` on the browse form: spread it, then add the literal `method="get"` and `action`. Submit checkboxes and `<select>` controls immediately on change. Submit price inputs on change with a 350 ms debounce: share one timer between the min and max inputs, clear any pending timer before you schedule `form.requestSubmit()`, and clear the timer on unmount. Update the mounted price inputs in place when bounds change externally, and cancel pending drafts on deliberate navigation. Keep newer typing when the URL update from the shopper's own price submission arrives. Preserve native Enter and form keyboard behavior. Cancel the pending timer whenever the form submits, so each submission sends one request.
- Keep every filter control (checkboxes, sort `<select>`, price inputs) mounted and enabled while `state.status === "loading"`, and show loading with a pending visual state. Keep stable keys based on control identity across filter updates, so the focused control stays in the DOM. Update external changes (chips, clear-all, back/forward) in place by binding checked and selected values to browse state. Keep native keyboard activation, such as Space on checkboxes and arrow keys on the `<select>`. Focus can still be lost if a result update removes the focused option, for example when zero-count options are hidden.
- Make price inputs currency-aware with the explicit server `currencyCode`. Get the prefix with `formatMoney({ amount: "0", currencyCode }, { locale }).currencyNarrowSymbol` and an explicit, stable `locale` (the resolved market locale, or one fixed locale in single-market stores) so server and client render the same symbol. The narrow symbol drops currency qualifiers (`$` for USD, CAD, and AUD instead of `CA$` or `A$`), so the accessible label carries the currency code. Do not add a separate `Intl.NumberFormat`, hardcode `$`, infer the currency from the locale, or convert amounts.
- Render each price input as `type="number"`, `min="0"`, `step="any"` in a wrapper with the symbol as an `aria-hidden="true"` prefix. The symbol is not part of the input value or URL params; params carry plain numbers only (`filter.v.price.gte=10.5`). Give each input an accessible label with minimum or maximum and the currency code, e.g. "Minimum price in CAD".
- Render a `noscript` submit button for filter sidebars that auto-submit when hydrated.
- Render "load more" / pagination as a GET link (the framework's link component) carrying the next-page cursor (e.g. `?after=<endCursor>`), so it works without JavaScript. Hydration may upgrade it to append-in-place; the bare link must still load the next page server-side (it replaces the page rather than appending when JS is off).
- Clear both `before` and `after` whenever filters or sorting change so the new browse state starts from its first page.
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
- Checkbox filters and `PRICE_RANGE` min/max controls both render, apply, and persist after reloading the URL.
- Price inputs show the narrow symbol for the loaded currency (e.g. `$` for USD or CAD, `€`, `¥`), and the symbol does not change after hydration.
- Decimal bounds such as `10.5` apply, and the URL carries only numeric `filter.v.price.gte`/`filter.v.price.lte` values, with no symbol or currency code.
- The symbol prefix and input stay aligned and usable at desktop and mobile widths.
- Accessible names identify minimum or maximum and the currency code; screen readers do not announce the symbol prefix.
- Reloading the filtered URL server-renders the same filtered state.
- With JavaScript disabled, checking filters and submitting the form loads the filtered URL.
- With JavaScript disabled, the load-more / pagination link loads the next page server-side.
- Active filter chips remove only one filter and preserve unrelated params.
- Search filters preserve `q`.
- Back/forward navigation settles loading state.
