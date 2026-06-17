# SvelteKit example

Port of the canonical `examples/base/` design to [SvelteKit 2](https://svelte.dev/docs/kit) with [Svelte 5](https://svelte.dev/docs/svelte) (runes mode).

## What this demonstrates

- SvelteKit's server `load` (`+page.server.ts`) as the data path — every route fetches its data on the server before rendering.
- Colocated GraphQL queries (the route owns its query and types).
- Core Hydrogen primitives for cart, product variant selection, collection filtering/sorting, and Shop Pay without framework bindings.
- File-based routes: `src/routes/+page.svelte`, `src/routes/collections/[handle]/+page.svelte`, etc.
- Shared chrome (`Header`, `Footer`) lives at the root layout in `src/routes/+layout.svelte`, not per-route.
- Tailwind v4 via `@tailwindcss/vite` — the design's `@theme` tokens live in `src/app.css`.
- `@sveltejs/adapter-node` so `pnpm start` actually serves the SSR build (`node build`).

## Pages

| Route | Source | Status |
|---|---|---|
| `/` | `examples/base/index.html` | Live: hero is static; featured products grid pulls from `products(first: 3)` |
| `/collections` | `examples/base/collections/index.html` | Live: queries `collections(first: 12)` |
| `/collections/:handle` | `examples/base/collections/men/index.html` | Live: queries `collection(handle:)` with up to 24 products, URL-synced filters, sort, and active filter chips |
| `/products/:handle` | `examples/base/products/hoodie/index.html` | Live: gallery, URL-synced variant options, add-to-cart, Shop Pay, and related products |
| `/cart` | Hydrogen cart primitive | Live: optimistic line updates, discount codes, order note, totals, checkout, and Shop Pay |
| `/blogs/news` | `examples/base/blogs/news/index.html` | Live: `blog(handle:"news") { articles(first: 10) }`, first article rendered as featured |
| `/blogs/news/:handle` | `examples/base/blogs/news/liquidpeak-450/index.html` | Live: `articleByHandle`, `contentHtml` rendered with `{@html}` |

## Stubbed vs. live

- **Live**: product data, collection data, prices, images, URL-synced options, cart mutations, collection filters/sort, checkout links, Shop Pay buttons, and blog articles.
- **Stubbed**: hero links, search, account, newsletter form, color swatch hex values (mapped client-side from option name → CSS color in `src/lib/components/ProductPurchasePanel.svelte`).

## Run

```sh
# from the repo root
pnpm install
pnpm --filter @shopify/hydrogen-example-sveltekit dev
```

Then open http://localhost:5173.

## Notes for the core SDK

These are calls/patterns that would benefit from a `@shopify/hydrogen` helper as the core package grows:

- `storefrontClient.graphql()` from `event.locals.storefrontClient` — now uses the request-scoped client created in `src/hooks.server.ts` with `gql.tada` for zero-config type inference. Error normalization and request-id propagation are handled by the core client.
- `formatMoney()` in `src/lib/money.ts` — every example needs money formatting from a `MoneyV2`-shaped object.
- `ProductCard.svelte` reads a narrow product shape (`handle`, `title`, `featuredImage`, `priceRange.minVariantPrice`). A core fragment + type for "product card" would let routes share GraphQL fragments instead of re-listing fields.
- Color swatch mapping (`SWATCHES` in `src/lib/components/ProductPurchasePanel.svelte`) is hand-rolled — option-value → swatch metadata is a real merchant problem; how should the SDK expose it?

## Open questions

- **Framework bindings**: this example intentionally uses core primitives directly. If Svelte bindings are added later, compare them against `src/lib/cart.ts`, `src/lib/collection.ts`, and `src/lib/components/ProductPurchasePanel.svelte`.
