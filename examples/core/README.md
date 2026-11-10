# Storefront Kit example core

This directory is the frozen, framework-agnostic design source for hand-built Hydrogen/Storefront Kit framework examples.

It was hand-derived from a Shopify reference Liquid theme and covers a **five-page storefront** — product, collection (PLP), collections list, search, and home — plus the shared site chrome (announcement bar, header with mobile-nav + cart drawers, footer) and the cross-cutting cookie/consent banner. Framework examples should translate this core idiomatically into their own components, loaders, forms, and Hydrogen/Storefront Kit skills—never copy the HTML line-for-line.

## Contents

- `tokens.css` — Tailwind v4 design tokens, type scale, semantic component classes, and product/chrome utilities. This is the single source of truth for styling; its contents are inlined into each reference page's `<style>` block (the `@tailwindcss/browser` CDN can't fetch external `@import`).
- `icons/` — copied SVG icons from the source theme used by the pages and chrome.
- `content.json` — verified copy strings (chrome, product, collection, products) from `locales/en.default.json`. Per-page copy that isn't centralized here is documented inline in the matching `notes/*.md`.
- `reference/` — standalone static reference pages (buildless HTML + Tailwind CDN):
  - `product.html` — product page (the runtime/cart anchor) + shared chrome + cart drawer.
  - `cart-drawer.html` — cart drawer state catalog (empty, single, multiple, in-drawer quantity, sale/compare-at, updating/removed/error). The live drawer overlay ships in the shared header; this page is the authoritative reference for its states.
  - `collection.html` — collection PLP (facets, sort, active-filter chips, "load more").
  - `collections.html` — collections index (grid of `CollectionCard` tiles).
  - `search.html` — search results (the collection machinery on a `q` query).
  - `home.html` — home/landing (hero + best-sellers + shop-by-category).
  - `consent-banner.html` — standalone cookie/consent banner design (chrome-less).
  - `_partials/header.html`, `_partials/footer.html` — single-source shared chrome, inlined into the pages.
- `notes/` — dynamic data/behavior notes for generation agents, one per page (`product.md`, `collection.md`, `collections.md`, `search.md`, `home.md`, `consent-banner.md`) plus `cart.md` for the cart-drawer contract and `engineering.md` for shared framework-agnostic engineering and architecture conventions.

## Keeping the references in sync

`tokens.css` and the chrome partials are the single sources; the reference pages carry verbatim copies of them between `AUTO-GENERATED` markers. If you edit either source, update the marked regions in each `reference/*.html` by hand to keep them in sync.

## View locally

```sh
pnpm --filter @shopify/hydrogen-example-core dev -- --port 5173
```

Open any page under `/reference/` (e.g. `/reference/product.html`) in a browser; the root redirects to the product reference.
