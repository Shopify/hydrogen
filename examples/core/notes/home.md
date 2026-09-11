# Home page core notes

This page is the frozen visual/design source for generated Hydrogen/Storefront Kit home (landing) examples. It is a static reference derived from a Shopify reference Liquid theme (`templates/index.liquid` and the blocks it composes) and covers the home page slice plus the shared site chrome (announcement bar, header, cart/mobile-nav drawers, footer) carried over verbatim from `reference/product.html`.

It reuses the same buildless setup as the product/collection references: `@tailwindcss/browser` CDN with the current `tokens.css` inlined into a `<style type="text/tailwindcss">` block (the CDN does not fetch external `@import`). Real framework examples import `../tokens.css` through their Vite build instead.

## Translate idiomatically

Do **not** transliterate `reference/home.html` line-for-line into a framework component. Use it as a visual and structural contract, then translate idiomatically into the target framework:

- Drive the dynamic sections from a route loader that queries the Storefront API once for the featured collection's products and a small set of featured collections, then render with framework-native fallbacks.
- Keep the **hero copy, image, and CTA targets static/editorial** — these are merchandising content, not API data (see split below). In a real app they would come from a CMS, section settings, or metaobjects, not the product/collection query.
- Reuse the **same `ProductCard`** as the product reference's "you may also like" cards and the collection grid — the card treatment is identical by design.
- Reuse the **same `CollectionCard`** treatment (overlay tile) for the "Shop by category" promos.
- Keep the semantic classes from `tokens.css` (`type-display`, `type-body-lg`, `type-heading-xl`, `type-body-sm`, `button-primary`, `button-secondary`, `badge-sale`, `overlay-dark`, `bleed-full`, `min-h-hero`, `max-w-page`, `text-sale`, `text-compare`, `text-interactive-text`) as the cross-example consistency anchor.
- Replace static demo data with real Storefront API data and framework-native fallbacks.

## Section composition (from `templates/index.liquid`)

1. **Hero** — full-bleed responsive editorial image (Unsplash/CMS-style, not a Shopify `.url`) with a gradient overlay; bottom-left copy block constrained to `max-w-page`. `type-display` heading, `type-body-lg` subtitle, and two CTA buttons (`button-primary` "Shop now" → `/collections`, `button-secondary` "Learn more" → `/collections` or another real in-scope route). The theme anchors copy at the bottom over a subtle bottom gradient; this reference uses the `overlay-dark` token for guaranteed legibility of the white (`text-interactive-text`) copy.
2. **Best sellers** — a heading row (`type-heading-xl` + a "View all →" link to `/collections`) over a product grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, `gap-x-1 gap-y-10`, `contain-paint`. Theme origin: `templates/index.liquid` paginates `collections.all.products by 8`; generated slices should treat that as provenance only and use the slice's real `/collections` route for CTAs. On the home page the **hero is the LCP**, so every best-sellers card is `loading="lazy"` (the grid is all-lazy). The eager-first-row pattern applies only to hero-LESS pages like PLP/search, where the first product row is the LCP candidate.
3. **Shop by category** — `type-heading-xl` heading over a collection-card grid (`grid-cols-1 md:grid-cols-3`, no gap) **contained to `max-w-page px-margin mx-auto`**. The theme renders `collections limit: 3`. Each tile is an `aspect-square` image with an `overlay-dark` gradient and a `type-body-lg` title (title-only — no product count, which the Storefront API can't supply cheaply), with a full-card link.

> **Bleed rule:** the **hero is the only full-bleed element** on the home page. Both the best-sellers grid and the shop-by-category grid are **constrained to `max-w-page px-margin mx-auto`** (centered, capped at `--spacing-page`/1280px), matching the rest of the storefront. Tiles still touch each other (`gap-0`) inside that constrained width.

## Dynamic vs. static map

| Static reference markup | Generated example responsibility |
| --- | --- |
| Hero image, heading ("Discover our latest collection"), subtitle, and CTA labels | **Static / editorial.** Source from section settings, a CMS, or a metaobject — not the product query. Keep the heading as the page `<h1>`. The hero image is editorial/Unsplash-style, not a Shopify `.url`; render it with responsive `srcset`/`sizes`, stable aspect/height, `loading="eager"`, and high fetch priority because it is the LCP candidate. |
| Hero "Shop now" / "Learn more" hrefs | Generated slice route: link "Shop now" to the real collections index (`/collections`) and point "Learn more" at a real in-scope route too (for example `/collections`) unless a real editorial page exists. Do **not** emit `#` for this primary-looking CTA. Theme origin: Shopify's `routes.all_products_collection_url` may resolve to a shop-specific all-products collection path, but this slice does not depend on that concrete path. |
| "Best sellers" heading + "View all" link | Static label; the "View all" href points at the real collections index route (`/collections`). |
| 8 product cards in the best-sellers grid | **Loader-driven.** Load via `collection(handle){ products(first: 8) }` (e.g. an all/best-sellers/featured collection) or `products(first: 8, sortKey: BEST_SELLING)`. Map nodes to the shared `ProductCard`; show `badge-sale` when `compareAtPrice > price`, `badge-soldout` when `!availableForSale`. |
| "Shop by category" heading | Static label. |
| 3 collection cards | **Loader-driven.** Load via `collections(first: 3)` (or a hand-picked list of handles). Render `collection.title` and `collection.image` (fallback to first product's `featuredImage`); link to `/collections/{handle}`. Title-only — do not render a product count, and do not fan out a large products connection inside the shared card fragment. |
| Product/collection titles, prices, images, counts | Render from API data; preserve sale semantics (`text-sale` + `<s class="text-compare">`). |
| Static navigation/footer links | Use the target app's route/link primitives and merchant/menu data where available. |

## Home data shape an agent needs

All of the below is mock.shop / Storefront API supported. A single home loader typically needs two lists — featured products and featured collections — plus static editorial for the hero:

```ts
type CoreHomePageData = {
  // STATIC / editorial — not from the product or collection query.
  hero: {
    heading: string;
    subtitle?: string;
    image: {url: string; altText?: string};
    primaryCta: {label: string; url: string};   // e.g. "Shop now" -> /collections
    secondaryCta?: {label: string; url: string}; // e.g. "Learn more" -> /collections or /pages/about
  };
  // DYNAMIC — featured products (best sellers).
  featuredProducts: Array<{
    id: string;
    handle: string;
    title: string;
    availableForSale: boolean;
    featuredImage?: {url: string; altText?: string};
    secondaryImage?: {url: string; altText?: string}; // images[1] for hover-swap
    price: {amount: string; currencyCode: string; formatted?: string};        // priceRange.minVariantPrice
    compareAtPrice?: {amount: string; currencyCode: string; formatted?: string};
  }>;
  // DYNAMIC — featured collections (shop by category).
  featuredCollections: Array<{
    id: string;
    handle: string;
    title: string;
    // title-only cards — no product count (the Storefront API has no cheap collection count)
    image?: {url: string; altText?: string}; // fallback to products(first:1).featuredImage
  }>;
};
```

The dynamic half is roughly:

```graphql
{
  # best sellers — either a curated collection's products...
  collection(handle: "best-sellers") {
    products(first: 8, sortKey: BEST_SELLING) {
      nodes { ...ProductCard }
    }
  }
  # ...or a top-level products query
  # products(first: 8, sortKey: BEST_SELLING) { nodes { ...ProductCard } }

  # shop by category
  collections(first: 3) {
    nodes {
      id
      handle
      title
      image { url altText }
      products(first: 1) {
        nodes { featuredImage { url altText } } # image fallback only — no count probe
      }
    }
  }
}
```

`ProductCard` is the same fragment used by the product and collection references (title, `featuredImage`, `images[1]` for hover-swap, `priceRange.minVariantPrice`, `compareAtPrice`, `availableForSale`).

Prices may arrive pre-formatted from the framework/Hydrogen money layer. Preserve the theme semantics: sale price uses `text-sale`, compare-at uses `<s class="text-compare">`, and regular price uses `text-on-surface`.

## Design decisions in this reference

- **Hero uses `bleed-full` + `overlay-dark`.** The hero image goes edge-to-edge via `bleed-full` (nested inside the `max-w-page px-margin` wrapper) — it is the **only** full-bleed element on the page; the copy re-constrains to `max-w-page` and anchors bottom-left. The theme's index uses a very subtle bottom gradient over a low-opacity surface tint; this reference swaps in the `overlay-dark` token so the white copy clears AA contrast in a static screenshot. A generator may use either treatment as long as the hero copy stays legible.
- **`min-h-hero` (`--spacing-hero: 60dvh`)** sets the hero height, matching the theme's `min-height: 60dvh`.
- **Best-sellers grid is `lg:grid-cols-4`** contained to `max-w-page px-margin mx-auto` (like the product page's "you may also like"), distinct from the collection PLP's `lg:grid-cols-3` (which sacrifices a column to the filter sidebar). Same `gap-x-1 gap-y-10`, `contain-paint`, `rounded-card` card treatment.
- **Category tiles have no gap** (`grid-cols-1 md:grid-cols-3`) inside a `max-w-page px-margin mx-auto` container, mirroring the theme's `collection-card` block: `aspect-square` image, `overlay-dark`, bottom-anchored `type-body-lg` title (title-only, no count), and a full-card `z-20` anchor.
- **"View all" arrow is an inline SVG.** Core's `icons/` set ships chevrons but no arrow-right; the theme uses `icon-arrow-right.svg`, so this reference inlines a minimal arrow SVG (the same inline-SVG pattern the product reference uses for the sold-out swatch line). A generator can use its own icon set.

## Without JavaScript

The home page is content + links, so it must render fully with scripting disabled (engineering.md §F4).

- **Hero, best-sellers grid, and shop-by-category grid render server-side** from the loader (the streamed grids must flush their server HTML, not depend on a client fetch). The hero is the LCP image and renders eager regardless.
- **Every card and CTA is a real link** — best-sellers cards link to `/products/{handle}`, category tiles to `/collections/{handle}`, and the hero/“View all” CTAs to real in-scope routes (no `#`, no JS-only handlers). A no-JS shopper can reach every merchandised destination.
- The shared chrome's no-JS contract (server-rendered nav with a mobile-nav fallback, reachable `/cart`) is documented in `product.md` “Without JavaScript” and `cart.md`.

## Gotchas

- **Hero is editorial, not product data.** Don't derive the hero heading/subtitle/image/CTAs from the featured-products query. The theme happens to seed the hero image from `collections.all.products.first.featured_image` as a fallback, but the copy and CTA targets are section settings / locale strings. In a generated app, model the hero as section/CMS content with a sensible image fallback, and point both visible CTAs at real in-scope routes.
- **Reuse the cards, don't fork them.** The best-sellers cards are the exact same `ProductCard` as the product page's related strip and the collection grid (image with `images[1]` hover-swap, `type-body-sm line-clamp-2` title, `text-sale` + `<s class="text-compare">` on sale, `badge-sale`/`badge-soldout` positioned `absolute start-2 top-2`). The category tiles are the same `CollectionCard` overlay treatment.
- **Featured product/collection source is merchant-configurable.** "Best sellers" can be a curated collection, `sortKey: BEST_SELLING`, or a metaobject-driven list; "Shop by category" can be `collections(first: 3)` or a hand-picked handle list. Don't hardcode handles in the design core — treat these as loader inputs.
- **Collection image has a fallback.** `collection.image` can be null; fall back to the collection's first product `featuredImage` (the theme's `collection-card` does exactly this) and to a placeholder when both are missing.
- **The hero is the LCP, so the best-sellers grid is all-lazy.** The hero image carries `loading="eager" fetchpriority="high"` and a responsive `srcset`/`sizes` pair for the editorial/Unsplash source — it's the LCP candidate on the home page, so do not ship one fixed 2000px URL to every viewport. Because the hero wins LCP, every best-sellers card is `loading="lazy"` (no eager first row, no card `fetchpriority="high"`). The eager-first-row treatment is for hero-LESS pages (PLP/search) where the first product row is the LCP instead.
- **Buttons/types/overlays are semantic classes.** Keep `button-primary`, `button-secondary`, `type-display`, `type-body-lg`, `type-heading-xl`, `overlay-dark`, `bleed-full`, `min-h-hero` from `tokens.css` for consistency across generated examples.
- **Swatch/badge semantics carry over.** Sale styling is the same as the other references; don't invent new price or badge treatments here.
