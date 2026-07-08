# Collection page core notes

This page is the frozen visual/design source for generated Hydrogen/Storefront Kit collection (PLP) examples. It is a static reference derived from a Shopify reference Liquid theme and covers the collection page slice plus the shared site chrome (announcement bar, header, cart/mobile-nav drawers, footer) carried over verbatim from `reference/product.html`.

It reuses the same buildless setup as the product reference: `@tailwindcss/browser` CDN with the current `tokens.css` inlined into a `<style type="text/tailwindcss">` block (the CDN does not fetch external `@import`). Real framework examples import `../tokens.css` through their Vite build instead.

## Translate idiomatically

Do **not** transliterate `reference/collection.html` line-for-line into a framework component. Use it as a visual and structural contract, then translate idiomatically into the target framework:

- Drive the page from a route loader that reads `handle`, sort, filter, and cursor params from the URL and queries the Storefront API (`collection(handle)` → `products(...)`).
- Use framework state/forms for the sort `<select>`, the filter form, and "load more" — keep the URL the source of truth so the page is shareable and back/forward works.
- Reuse the **same `ProductCard`** as the product reference's "you may also like" cards — the card treatment is identical by design.
- Keep the semantic classes from `tokens.css` (`type-display`, `type-body-sm`, `button-outline`, `button-primary`, `badge-sale`, `badge-soldout`, `chip-filled`, `swatch-md`, `max-w-page`, `text-sale`, `text-compare`, `text-accent`) as the cross-example consistency anchor.
- Replace static demo data with real Storefront API data and framework-native fallbacks.
- **Streaming & caching:** render the chrome, breadcrumb, collection heading/description, toolbar frame, and grid skeleton as the static shell; stream the product grid/facet data behind the framework's data boundary and cache non-personalized collection catalog reads with tag-based invalidation. URL-driven filter/search params remain dynamic inputs, but the shared catalog client must still be cache-aware where possible.

## Dynamic vs. static map

| Static reference markup | Generated example responsibility |
| --- | --- |
| Hardcoded breadcrumb `Home / Outerwear` | Build from route/collection data; last crumb is `aria-current="page"`. Emit `BreadcrumbList` JSON-LD that mirrors the visible trail. |
| Hardcoded collection title/description (`type-display` + `richtext`) | Render `collection.title` and `collection.description`/`descriptionHtml`; optional collection `image` hero if the merchant set one. |
| Static "10 products" count | Render from collection product count / `products.filters` totals; update on filter changes and announce via a live region. |
| Static sort `<select>` (Featured / Best selling / A–Z / Price / Date) | Map each option to a `sortKey` + `reverse` pair; submit on change and write `sort_by` (or your own param) to the URL; re-query with the new `sortKey`. |
| Static facet groups in the sidebar + drawer | Render from the API-returned `products.filters` array. Group order, labels, value labels, and counts all come from the backend (Search & Discovery). Do not hardcode. |
| Static checkbox/swatch "checked" states | Derive `checked` from the active filter params in the URL; submit the filter form to update them. |
| Static active-filter chips (`In stock`, `Jackets`, `Clear all`) | Render one removable chip per active filter value; each chip's href is a URL with that value removed. "Clear all" links to the collection URL with no filter params. |
| Static price range `Min`/`Max` inputs | Bind to the `price` filter's `gte`/`lte` params; values are a numeric range, not discrete options. |
| Static product grid cards | Map `products.nodes` to the shared `ProductCard`; show `badge-sale` when `compareAtPrice > price`, `badge-soldout` when `!availableForSale`; first row eager + `fetchpriority="high"`, rest lazy. |
| Static "Load more" button + "Showing 9 of 10" | Reflect `pageInfo.hasNextPage`; on click, re-query with `after: pageInfo.endCursor` and **append** the new nodes to the existing grid (don't replace). Hide/disable when `hasNextPage` is false. |
| Static navigation/footer links | Use the target app's route/link primitives and merchant/menu data where available. |

## Collection data shape an agent needs

This is what mock.shop / the Storefront API returns (verified). At minimum, collection page generation needs:

```ts
type CoreCollectionPageData = {
  collection: {
    id: string;
    handle: string;
    title: string;
    description?: string;
    descriptionHtml?: string;
    image?: {url: string; altText?: string; width?: number; height?: number};
    products: {
      // Available facets, as returned by the API for the current result set
      filters: Array<{
        id: string;          // opaque, e.g. "filter.v.availability"
        label: string;       // e.g. "Availability", "Price", "Color"
        type?: 'LIST' | 'PRICE_RANGE' | 'BOOLEAN';
        values: Array<{
          id: string;        // opaque, e.g. "filter.v.availability.1"
          label: string;     // e.g. "In stock"
          count: number;     // result count if this value is applied
          input?: string;    // JSON string to feed back into the `filters` input
        }>;
      }>;
      pageInfo: {hasNextPage: boolean; endCursor?: string};
      nodes: Array<{
        id: string;
        handle: string;
        title: string;
        availableForSale: boolean;
        featuredImage?: {url: string; altText?: string};
        secondaryImage?: {url: string; altText?: string}; // images[1] for hover-swap
        price: {amount: string; currencyCode: string; formatted?: string};        // priceRange.minVariantPrice
        compareAtPrice?: {amount: string; currencyCode: string; formatted?: string};
      }>;
    };
  };
};
```

The query is roughly:

```graphql
collection(handle: $handle) {
  title
  description
  image { url altText }
  products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
    filters { id label type values { id label count input } }
    pageInfo { hasNextPage endCursor }
    nodes { ...ProductCard }
  }
}
```

### Sort key mapping

The visible sort options map to `sortKey` (a `ProductCollectionSortKeys` enum) plus a `reverse` boolean:

| UI option | `sortKey` | `reverse` |
| --- | --- | --- |
| Featured | `MANUAL` (or `COLLECTION_DEFAULT`) | `false` |
| Best selling | `BEST_SELLING` | `false` |
| Alphabetically, A–Z | `TITLE` | `false` |
| Alphabetically, Z–A | `TITLE` | `true` |
| Price, low to high | `PRICE` | `false` |
| Price, high to low | `PRICE` | `true` |
| Date, new to old | `CREATED` | `true` |

### Filters input

Active filters are passed back as the `filters` argument — an array of `ProductFilter` objects. The cleanest path is to round-trip the `input` string the API hands back on each `values[].input` (it is already a serialized `ProductFilter`). Price is the exception: it's a range, fed as `{ price: { min, max } }`.

All of the above — `filters`, `sortKey`/`reverse`, cursor pagination — is mock.shop-supported.

## Design decisions in this reference

- **Sidebar on desktop, drawer on mobile.** The theme (`_filter-drawer.liquid`) uses a left drawer at every breakpoint. For a static screenshot the facets need to be visible, so this reference renders a sticky **desktop sidebar** (`lg:grid lg:grid-cols-[240px_1fr]`) and a **mobile filter drawer** with identical facet content (opened by the `lg:hidden` "Filters" button in the toolbar). Both are acceptable per the brief ("desktop sidebar or drawer per the theme"); a generator can pick either and keep the same facet treatment.
- **Facet group treatments** follow the theme's `_filter-drawer`: list facets (Availability, Product type) use the sr-only-checkbox + custom check box pattern with counts; the Price facet is a two-input numeric range (`.gte`/`.lte`); the Color facet uses the `swatch-md` pill presentation with a check overlay. A `bg-interactive` count badge sits next to a group's label when it has active values.
- **Active-filter chips** are removable `chip-filled` anchors (each href removes just that value), followed by a `text-accent` "Clear all" link — mirroring `_active-filter-chips.liquid`.
- **Grid** is `grid-cols-2 lg:grid-cols-3` inside the results column (the product reference's related-products strip is full-width `lg:grid-cols-4`; here the sidebar takes a column so 3 reads better). Same `gap-x-1 gap-y-10`, `contain-paint`, and `rounded-card` card treatment.
- **Pagination is a "Load more" button**, not numbered pages. The theme template ships `s-scroll-paginate` (cursor/scroll based); this reference shows the button form, which maps directly to `pageInfo.hasNextPage` + `endCursor`. The numbered `_pagination.liquid` block exists in the theme but is the offset-paginate variant — cursor "load more" is the better fit for the Storefront API.

## Without JavaScript

The PLP must browse, filter, sort, and paginate with scripting disabled (engineering.md §F4). These are design requirements; skills own the framework code.

- **Grid renders server-side.** The collection heading/description, the product grid, the active-filter chips, and the result count all render from the loader without JS. Cards are real `/products/{handle}` links.
- **Sort + filters are GET forms.** The sort `<select>` and the facet form use `method="get"` and write their params to the URL. Because the sort normally submits on `change` (JS), the form includes a real submit control exposed in `<noscript>` (a “Show results” / “Apply” button) so a no-JS shopper can apply sort/filters. Active-filter chips and “Clear all” are plain links to the same URL with that value removed.
- **Price range submits without JS** via the same GET filter form (the `gte`/`lte` inputs are real form fields).
- **Load more degrades to a link.** With JS off, “Load more” is a real `<a>`/`<Link>` to the collection URL with `after={endCursor}` that renders *that* page (replace, not append). JS upgrades it to in-place append. The page stays shareable/back-forward-correct because the URL is authoritative.
- The filter **drawer** is a PE overlay: its facet form is the same GET form, so the facets remain submittable even if the drawer never opens.

## Gotchas

- **Facet ids are opaque.** `filters[].id` and `values[].id` (e.g. `filter.v.availability.1`) are backend-defined strings — never construct, parse, or hardcode them. Round-trip `values[].input` back into the `filters` query argument.
- **Price is a range, not options.** The price facet has no discrete `values` to check; it's min/max numeric inputs feeding `{ price: { min, max } }`. Its active chip shows the range, and its "remove" clears both bounds.
- **"Load more" appends.** Cursor pagination with `after: endCursor` returns the *next* page only — append to the rendered grid, don't replace it. Keep the latest `endCursor` and re-evaluate `hasNextPage` after each fetch. Changing sort or filters resets the cursor.
- **Counts reflect the current result set.** `values[].count` is the count *if applied to the current results*, so counts shift as other filters change. Re-render facet counts from each query response.
- **Swatch colors are merchant data.** The reference uses placeholder hex values (`#755353`, etc.) to show treatment only. A generator must source swatch color/image from the filter value's swatch data (Search & Discovery), not from hardcoded design assumptions.
- **Reuse the product card.** The grid card here and the product page's "you may also like" card are intentionally the same component — image with hover-swap (`images[1]`), title (`type-body-sm line-clamp-2`), price block (`text-sale` + `<s class="text-compare">` on sale), and `badge-sale`/`badge-soldout` positioned `absolute start-2 top-2`.
- **`<s-*>` elements are behavioral spec only.** `<s-live-form>`, `<s-scroll-paginate>`, `<s-filter>`, and `<s-dialog>` are hints for required behavior (live filter submission, scroll/cursor pagination, collapsible facet groups, the modal drawer) and DOM roles. Do not port theme JavaScript — replace with framework state/components and Hydrogen/Storefront Kit skills.
- **Keep the URL authoritative.** Sort, filters, and pagination cursor should live in the URL/search params so the PLP is shareable, indexable, and works with browser navigation.
