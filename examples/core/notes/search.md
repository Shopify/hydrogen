# Search results page core notes

This page is the frozen visual/design source for generated Hydrogen/Storefront Kit search-results (`/search`) examples. It is a static reference derived from a Shopify reference Liquid theme (`templates/search.liquid` plus the shared `_filter-drawer`, `_active-filter-chips`, and `product-card`/`resource-card` blocks) and covers the search-results slice plus the shared site chrome (announcement bar, header, cart/mobile-nav drawers, footer) carried over verbatim from `reference/collection.html`.

It reuses the same buildless setup as the product and collection references: `@tailwindcss/browser` CDN with the current `tokens.css` inlined into a `<style type="text/tailwindcss">` block (the CDN does not fetch external `@import`). Real framework examples import `../tokens.css` through their Vite build instead.

## Why it looks like the collection page

A search results page is essentially a collection page with a query header. The theme proves this: `templates/search.liquid` reuses the **same** `_filter-drawer`, `_active-filter-chips`, `product-card`, sort `<select>`, and `s-scroll-paginate` blocks that the collection template uses. So this reference deliberately reuses `collection.html`'s toolbar, faceted sidebar/drawer, active-filter chips, product grid, and "Load more" treatment **verbatim** — only the header above the toolbar and the data wiring differ. Generated search and collection pages should share the same components.

The only search-specific additions are:

- A **search header** — an `h1` (theme `search.title` → "Search"), a visible `type="search"` input prefixed with `/icons/icon-search.svg` and suffixed with a clear (`×`) button, all inside a `role="search"` form that submits `q`.
- A **result-count echo** that names the query — the theme's `search.results_for` string, `"{{ count }} results found for {{ terms }}"` → "8 results found for “shirt”". This sits in the toolbar where the collection shows "10 products", and is wrapped in an `aria-live="polite"` region so it announces on re-query.

## Translate idiomatically

Do **not** transliterate `reference/search.html` line-for-line. Use it as a visual and structural contract, then translate idiomatically into the target framework:

- Drive the page from a route loader that reads the query (`q`), sort, filter, and cursor params from the URL and calls the Storefront API `search(...)` connection.
- Use framework state/forms for the search input, sort `<select>`, filter form, and "Load more" — keep the URL the source of truth so the page is shareable, indexable, and back/forward works.
- Reuse the **same `ProductCard`** as the product and collection references — the card treatment is identical by design.
- Keep the semantic classes from `tokens.css` (`type-display`, `type-body-sm`, `button-outline`, `button-primary`, `badge-sale`, `badge-soldout`, `chip-filled`, `swatch-md`, `max-w-page`, `text-sale`, `text-compare`, `text-accent`) as the cross-example consistency anchor.
- Replace static demo data with real Storefront API data and framework-native fallbacks.
- **Streaming & caching:** render the chrome, breadcrumb, search header/form, and empty/grid skeleton as the immediate shell; stream the query-dependent result grid/facets behind the framework's data boundary. Search results are request/query-scoped, but shared chrome and any non-personalized supporting catalog data should still use cacheable clients instead of blocking the route shell.

## Dynamic vs. static map

| Static reference markup | Generated example responsibility |
| --- | --- |
| Hardcoded breadcrumb `Home / Search` | Build from route data; last crumb is `aria-current="page"`. |
| `h1` "Search" | Render the static page title (theme `search.title`); it does not change per query. |
| Search `<input value="shirt">` | Bind `value` to the current `q` search param; submit (debounced) writes `q` back to the URL and re-queries. The clear button empties `q`. |
| Static "8 results found for “shirt”" | Render from `search` total / result count + the echoed term; update on every re-query and announce via the live region. The term must be HTML-escaped (it is user input). |
| Static sort `<select>` (Relevance / Price ↑ / Price ↓) | Map each option to a `searchSortKeys` + `reverse` pair; submit on change and write `sort_by` to the URL; re-query. **Relevance is the search default** (`RELEVANCE`), not "Featured". |
| Static facet groups in the sidebar + drawer | Render from the API-returned **`search.productFilters`** array — *not* `collection.products.filters`. Same `{id,label,values{id,label,count}}` shape; group order, labels, value labels, and counts all come from the backend (Search & Discovery). Do not hardcode. |
| Static checkbox/swatch "checked" states | Derive `checked` from the active filter params in the URL; submit the filter form to update them. |
| Static active-filter chips (`In stock`, `Shirts`, `Clear all`) | Render one removable chip per active filter value; each chip's href removes just that value (preserving `q`). "Clear all" links to the search URL with only `q` (e.g. `/search?q=shirt`). |
| Static price range `Min`/`Max` inputs | Bind to the `price` filter's `gte`/`lte` params; values are a numeric range, not discrete options. |
| Static product grid cards | Map `search.nodes` (filtered to `Product`) to the shared `ProductCard`; `badge-sale` when `compareAtPrice > price`, `badge-soldout` when `!availableForSale`; first row eager + `fetchpriority="high"`, rest lazy. |
| Static "Load more" + "Showing 8 of 12 results" | Reflect `pageInfo.hasNextPage`; on click re-query with `after: pageInfo.endCursor` and **append** new nodes. Hide/disable when `hasNextPage` is false. Changing `q`, sort, or filters resets the cursor. |
| (Not shown) empty state | When the query returns nothing, replace the toolbar/sidebar/grid with a "No results for “…”" message. See **Empty state** below. |
| Static navigation/footer links | Use the target app's route/link primitives and merchant/menu data where available. |

## Search data shape an agent needs

This is the `search` connection on the Storefront API (mock.shop-supported). Note it lives at the query root, **not** under `collection`:

```ts
type CoreSearchPageData = {
  searchTerm: string;            // the echoed query (from the `q` param)
  search: {
    // Facets for the current result set — search.productFilters, same shape as collection filters
    productFilters: Array<{
      id: string;          // opaque, e.g. "filter.v.availability"
      label: string;       // e.g. "Availability", "Price", "Color"
      type?: 'LIST' | 'PRICE_RANGE' | 'BOOLEAN';
      values: Array<{
        id: string;        // opaque, e.g. "filter.v.availability.1"
        label: string;     // e.g. "In stock"
        count: number;     // result count if this value is applied
        input?: string;    // JSON string to feed back into the `productFilters` input
      }>;
    }>;
    pageInfo: {hasNextPage: boolean; endCursor?: string};
    // Heterogeneous: search returns products, articles, pages... filter to Product for the grid
    nodes: Array<
      | {
          __typename: 'Product';
          id: string;
          handle: string;
          title: string;
          availableForSale: boolean;
          featuredImage?: {url: string; altText?: string};
          secondaryImage?: {url: string; altText?: string}; // images[1] for hover-swap
          price: {amount: string; currencyCode: string; formatted?: string};
          compareAtPrice?: {amount: string; currencyCode: string; formatted?: string};
        }
      | {__typename: 'Article' | 'Page'; id: string; title: string /* ... */}
    >;
  };
};
```

The query is roughly:

```graphql
search(
  query: $q,
  first: $first,
  after: $after,
  sortKey: $sortKey,        # SearchSortKeys
  reverse: $reverse,
  productFilters: $productFilters
) {
  productFilters { id label type values { id label count input } }
  pageInfo { hasNextPage endCursor }
  nodes {
    ... on Product { ...ProductCard }   # filter to Product for the grid
  }
}
```

### Sort key mapping

Search sort uses the `SearchSortKeys` enum (smaller than collection sort) plus a `reverse` boolean. **The default is relevance**, which only makes sense for search:

| UI option | `sortKey` | `reverse` |
| --- | --- | --- |
| Relevance (default) | `RELEVANCE` | `false` |
| Price, low to high | `PRICE` | `false` |
| Price, high to low | `PRICE` | `true` |

(`SearchSortKeys` also exposes `PRICE` and `RELEVANCE`; relevance is undefined once you sort by anything else, so keep it as the reset/default.)

### Filters input

Active filters round-trip the same way as the collection page: feed each active `values[].input` (a serialized `ProductFilter`) back into the `productFilters` argument. Price is the exception — it's a range, fed as `{ price: { min, max } }`.

All of the above — `productFilters`, `sortKey`/`reverse`, cursor pagination — is mock.shop-supported.

## Empty state

The HTML shows the **populated** state. When `search` returns zero results, the theme (`templates/search.liquid`) renders only the `search.no_results` string — `"No results found for {{ terms }}"`. The generated empty state should:

- **Keep the search header** (h1 + the visible search input with the query still in it) so the shopper can edit and retry.
- **Drop the toolbar, facet sidebar/drawer, active chips, grid, and "Load more"** — there is nothing to filter, sort, or paginate.
- Render a `type-body text-on-surface-secondary` message: **No results for “…”** (escape the term). Optionally add a short suggestion line ("Check your spelling or try a more general term.") and links to popular collections — but the theme's minimum is just the message.
- Announce the change via the live region (the theme uses `search.no_results_announcement`).

A no-query state (landing on `/search` with empty `q`, `search.performed == false`) renders just the header/input and nothing below it.

## Without JavaScript

Search must query, filter, sort, and paginate with scripting disabled (engineering.md §F4) — it inherits the PLP's no-JS contract plus the query form.

- **The search form is a real `role="search"` GET form** that submits `q` to `/search`; landing on `/search?q=…` renders results server-side. The header search trigger also degrades to a real `/search` link/form (the `<noscript>` GET form already present in the shared header).
- **Result grid + count echo render server-side** from the loader; cards are real `/products/{handle}` links and the escaped term appears in the input value and the count echo.
- **Sort + facet forms are GET** with a `<noscript>`/real submit control (same as the PLP), preserving `q`. Active chips and “Clear all” are links back to `/search?q=…` with the value removed.
- **Load more degrades to a link** carrying `after={endCursor}` (render-that-page, not append); JS upgrades to in-place append. The empty/no-query states render server-side from the loader.

## Gotchas

- **Filters come from `search.productFilters`, not `collection.products.filters`.** Same shape, different field on a different root connection. Generators must not assume a `collection` wrapper exists on this route.
- **Results are heterogeneous.** `search.nodes` can include `Article` and `Page` alongside `Product`. This product-grid reference filters to `Product` (the theme branches on `result.object_type == 'product'` and falls back to a `resource-card` for other types). If you surface non-product results, render them with the universal `resource-card` treatment; the populated grid here intentionally shows products only to stay visually identical to the collection page.
- **Term fidelity across the handoff.** The term the shopper types in the predictive-search modal is carried **verbatim** into the modal's “View all results” handoff and onto this `/search?q=` page: the typed string must equal the `q` on the resulting URL, with no one-sided mangling, truncation, case-folding, or wildcard/`*` injection on either side. This is a **term-string** guarantee only — it does **not** mean the predictive modal and full-text `/search` return the same result set (they run different algorithms and legitimately differ).
- **The browse-state identity is `search:${term}`.** The collection page keys its browse/filter state on the collection handle; search keys it on the query string (`search:shirt`). Use the term (not a handle) when scoping cached filter/cursor state.
- **The term is user input — escape it.** It appears in the input `value`, the result-count echo, the empty-state message, and the "Clear all"/chip URLs (URL-encode there). Never inject it unescaped.
- **Facet ids are opaque.** `productFilters[].id` and `values[].id` are backend-defined strings — never construct, parse, or hardcode them. Round-trip `values[].input` back into the `productFilters` query argument.
- **Price is a range, not options.** The price facet has no discrete `values`; it's min/max numeric inputs feeding `{ price: { min, max } }`. Its active chip shows the range, and its "remove" clears both bounds.
- **"Load more" appends.** Cursor pagination with `after: endCursor` returns the *next* page only — append to the rendered grid, don't replace it. Changing `q`, sort, or filters resets the cursor.
- **Counts reflect the current result set.** `values[].count` is the count *if applied to the current results*, so counts shift as other filters (and the query) change. Re-render facet counts from each response.
- **Relevance is special.** It's the only search default and is meaningless once another sort key is chosen — treat it as the reset option, not a peer of price sorts.
- **Swatch colors are merchant data.** The reference uses placeholder hex values (`#3b4a6b`, etc.) to show treatment only. Source swatch color/image from the filter value's swatch data (Search & Discovery), not from hardcoded design assumptions.
- **Reuse the product card.** The grid card here is the same component as the collection grid and the product page's "you may also like" cards — image with hover-swap (`images[1]`), title (`type-body-sm line-clamp-2`), price block (`text-sale` + `<s class="text-compare">` on sale), and `badge-sale`/`badge-soldout` positioned `absolute start-2 top-2`.
- **`<s-*>` elements are behavioral spec only.** `<s-live-form>` (debounced live re-query of `q`/filters/sort), `<s-scroll-paginate>` (scroll/cursor pagination), `<s-filter>` (collapsible facet groups), and `<s-dialog>` (the modal drawer) are hints for required behavior and DOM roles. Do not port theme JavaScript — replace with framework state/components and Hydrogen/Storefront Kit skills.
- **Keep the URL authoritative.** `q`, sort, filters, and the pagination cursor should live in the URL/search params so the results page is shareable, indexable, and works with browser navigation.
