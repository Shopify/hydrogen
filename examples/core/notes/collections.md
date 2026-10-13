# Collections list page core notes

This page is the frozen visual/design source for generated Hydrogen/Storefront Kit **collections-list** (`/collections`) examples. It is a static reference derived from a Shopify reference Liquid theme and covers the collections-index slice plus the shared site chrome (announcement bar, header, cart/mobile-nav drawers, footer) carried over verbatim from `reference/collection.html`.

It reuses the same buildless setup as the product/collection references: `@tailwindcss/browser` CDN with the current `tokens.css` inlined into a `<style type="text/tailwindcss">` block (the CDN does not fetch external `@import`). Real framework examples import `../tokens.css` through their Vite build instead.

> Don't confuse this with the **collection** (PLP) page. `reference/collection.html` is a single collection's product grid with facets/sort/pagination. **This** page is the index of collections — a grid of `CollectionCard`s, each linking to `/collections/{handle}`.

## Translate idiomatically

Do **not** transliterate `reference/collections.html` line-for-line into a framework component. Use it as a visual and structural contract, then translate idiomatically into the target framework:

- Drive the page from a route loader that queries the Storefront API `collections(first: N)` connection (optionally paginated with `after`/`pageInfo`).
- Introduce a reusable **`CollectionCard`** component (analogous to `ProductCard`, but for a collection): square image, gradient overlay, and title only, with the whole card a single stretched link to `/collections/{handle}`.
- Keep the semantic classes from `tokens.css` (`type-display`, `type-body-lg`, `type-body-sm`, `overlay-dark`, `rounded-card`, `max-w-page`, `text-interactive-text`) as the cross-example consistency anchor.
- Replace static demo data with real Storefront API data and framework-native fallbacks.

## Dynamic vs. static map

| Static reference markup | Generated example responsibility |
| --- | --- |
| Hardcoded breadcrumb `Home / Collections` | Build from route data; last crumb is `aria-current="page"`. Optionally emit `BreadcrumbList` JSON-LD mirroring the visible trail. |
| Hardcoded page heading `Collections` (`type-display`) | Static label for the index (the theme uses a `collections.all_collections` translation string). No per-collection title here. |
| Static grid of 6 `CollectionCard`s | Map `collections.nodes` to the `CollectionCard`. First row (theme: first 3) eager + `fetchpriority="high"` on the first, the rest `loading="lazy"`. |
| Hardcoded collection title (`type-body-lg`) | Render `collection.title` as plain text in the caption. The full-card `.card-link` (a direct child of `.card`) carries `aria-label={collection.title}`. |
| Hardcoded collection image | Render `collection.image`. Fall back to the collection's first product image, then to a placeholder texture (see gotchas). |
| No card subtitle/count line | Omit the collection-card subtitle in generated examples. Do not fabricate numeric-looking product counts or coarse `N+ products` text for a cosmetic card label. |
| Hardcoded card link `/collections/{handle}` | Build from the target app's route/link primitive using `collection.handle`. |
| Static navigation/footer links | Use the target app's route/link primitives and merchant/menu data where available. |
| (No pagination shown) | The theme paginates by 24. If a shop has more collections than the first page, add cursor "load more" (`pageInfo.hasNextPage` + `endCursor`) the same way the collection PLP does. |

## Collections data shape an agent needs

This is what mock.shop / the Storefront API returns (verified — handles like `men`, `women`, `unisex`, `tops`, `bottoms`). At minimum, collections-list generation needs:

```ts
type CoreCollectionsListPageData = {
  collections: {
    pageInfo: {hasNextPage: boolean; endCursor?: string};
    nodes: Array<{
      id: string;
      handle: string;
      title: string;
      description?: string;
      image?: {url: string; altText?: string; width?: number; height?: number};
      // Product count is NOT a direct scalar on Collection in the Storefront API.
      // The core card intentionally omits a subtitle/count line.
      products: {
        nodes: Array<{featuredImage?: {url: string; altText?: string}}>;
        pageInfo?: {hasNextPage: boolean};
      };
    }>;
  };
};
```

The query is roughly:

```graphql
query CollectionsList($first: Int!, $after: String) {
  collections(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      handle
      title
      description
      image { url altText width height }
      # Pull a single product as an image fallback when image is null.
      # Do not derive a cosmetic count/subtitle from this connection.
      products(first: 1) {
        nodes { featuredImage { url altText } }
        pageInfo { hasNextPage }
      }
    }
  }
}
```

`collections(first:)` cursor pagination is mock.shop-supported.

## CollectionCard design decisions

The card is translated from the theme's `blocks/collection-card.liquid` (an **overlay** card), not from `ProductCard` (a stacked image-over-text card). It stays visually consistent with `ProductCard` by reusing the same `group` + `rounded-card` + `aspect-square` + hover-zoom conventions:

- **Overlay layout.** Square image fills the card; an `overlay-dark` gradient sits on top (`pointer-events-none absolute inset-0`); the title (`type-body-lg`) is overlaid bottom-left in `text-interactive-text` (white). Keep the overlay so the title remains legible over any image.
- **Whole card is one stretched link (split-link pattern).** The title is plain text (no anchor). A **separate** `<a class="card-link" aria-label="{title}">` is a **direct child of the `.card` `<article>`** — NOT nested inside the absolutely-positioned caption. Because `.card` is `position: relative` and `.card-link::after { inset: 0 }`, the stretched hit-area then climbs to the whole card, not just the caption box. The caption div is `pointer-events-none` so the entire surface (including over the visible title) routes clicks to the card link. This is the collection analogue of `ProductCard`'s stretched-link overlay, which works for the same reason (its caption is a normal-flow child of the relative `.card`). Do NOT put the `.card-link` inside the absolute caption — its `::after` would then only cover the caption, breaking whole-card click.
- **Hover zoom matches `ProductCard`.** The image wrapper uses `motion-safe:group-hover:scale-[1.04]` (the theme card uses `1.03`; aligned to `1.04` to match the product card for cross-example consistency).
- **`rounded-card`.** Resolves to `--radius-card: 0` in the current tokens, i.e. square corners. The theme card exposes a `border_radius` setting (`rounded-none` default); a generator can wire that up, but the design core uses the token.
- **Grid.** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` mirrors the theme template's `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. The theme renders the cards flush (no gap, mosaic); this reference adds a modest `gap-4` so each overlay card reads as a discrete tile in a static screenshot — either is acceptable, keep the same card treatment.
- **No facets/sort/pagination toolbar.** Unlike the collection PLP, the collections index has no filters or sort. The theme paginates by 24 with `_pagination.liquid`; this reference shows a single page (6 cards). Add cursor "load more" if you expect more than one page.

## Gotchas

- **Product count is omitted.** `Collection` has no public `productsCount` scalar in the Storefront API (it exists on the Admin API). The core reference intentionally uses title-only collection cards on both `/collections` and the home category grid. Do **not** put a large (>=25) `products()` fan-out inside a card fragment shared by the home grid and the 12-up `/collections` list; that multiplies Storefront API cost for a cosmetic label. Never fabricate static demo counts client-side, and do not render numeric-looking coarse labels such as `N+ products`.
- **Image is optional; fall back gracefully.** A collection may have no `image`. The theme falls back to `collection.products.first.featured_image`, then to a placeholder texture. Mirror that: collection image → first product image → placeholder. Keep the gradient overlay regardless so the white title stays legible over any image.
- **Overlay keeps text legible.** The white title relies on the `overlay-dark` gradient for contrast. Don't drop the overlay; if a light overlay is used, switch the text to `text-on-surface`.
- **Card is the collection analogue of `ProductCard`.** Reuse the shared `group`/`rounded-card`/`aspect-square`/hover-zoom treatment so collection and product grids feel like one system — but the internal layout differs on purpose (overlay text vs. text-below-image).
- **`<s-*>` elements are behavioral spec only.** `<s-dialog>`, `<s-cart>`, `<s-mobile-nav>`, `<s-nav-dropdown>` in the shared chrome are hints for required behavior and DOM roles. Do not port theme JavaScript — replace with framework state/components and Hydrogen/Storefront Kit skills.
- **Keep links route-native.** Each card links to `/collections/{handle}`; build these with the target app's link primitive, not hardcoded strings.
