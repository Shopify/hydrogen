# Base example

Canonical static design for Hydrogen examples. Pure HTML + Tailwind via CDN — no application JS, no build step.

Framework examples (React Router, Next.js, Astro, etc.) start from this design and replace the hardcoded data with live calls to the Storefront API.

## Pages

- `/` — home (hero, featured products, newsletter)
- `/collections` — collections index
- `/collections/men` — collection grid
- `/products/hoodie` — product detail (gallery, options, add-to-cart, related)
- `/blogs/news` — news index
- `/blogs/news/liquidpeak-450` — news article detail

## Data source

All product/collection data is hardcoded from a snapshot of:

```
https://demostore.mock.shop/api/2026-04/graphql.json
```

Framework examples fetch this live; the base template freezes a representative response so the design renders without any runtime dependencies.

## Run

```sh
pnpm install
pnpm dev
```

Then open http://localhost:5173.
