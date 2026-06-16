# Next.js (App Router) example

Next.js storefront example using the App Router with server components by default.

## What this demonstrates

- Server components as the data path — routes fetch their GraphQL data on the server, while cart/product forms use Hydrogen client primitives for mutations.
- Colocated GraphQL queries (the route's `page.tsx` owns its query and types).
- File-based App Router conventions: `app/page.tsx`, `app/collections/[handle]/page.tsx`, `app/products/[handle]/page.tsx`, `app/blogs/news/[handle]/page.tsx`.
- Async `params` (Next.js 16): `params: Promise<{ handle: string }>` — must be `await`ed before use.
- `generateMetadata` for dynamic page titles.
- `notFound()` from `next/navigation` to render the framework's 404 boundary.
- Shared chrome (`Header`, `Footer`) lives at the root layout in `app/layout.tsx`, not per-route.
- Tailwind v4 via `@tailwindcss/postcss` — the design's `@theme` tokens live in `app/globals.css`.
- `next/font/google` self-hosting Inter, wired to Tailwind's `--font-sans` token via the `variable` option.

## AGENTS.md

The scaffold ships an `AGENTS.md` (and `CLAUDE.md` pointer to it) that tells coding agents to read `node_modules/next/dist/docs/` before writing code, since training data lags behind the current release. Kept as-is — that's the whole point of using the latest scaffold.

## Pages

| Route | Status |
|---|---|
| `/` | Live: hero is static; featured products grid pulls from `products(first: 3)` |
| `/collections` | Live: lists `collections(first: 12)` |
| `/collections/[handle]` | Live: queries `collection(handle:)` with up to 24 products |
| `/products/[handle]` | Live: gallery, options (Size + Color swatches), add-to-cart UI; "You may also like" from `products(first: 4)` |
| `/blogs/news` | Live: queries `blog(handle:"news").articles(first: 10)` |
| `/blogs/news/[handle]` | Live: queries `blog(handle:"news").articleByHandle` |

## Stubbed vs. live

- **Live**: product data, collection data, article content, prices, images, options, cart state (server-fetched via `createCartServerHandlers().get` in the root layout and hydrated into `CartProvider`), cart drawer, cart page mutations, product variant selection, add-to-cart, checkout, Shop Pay.
- **Stubbed**: hero links, search, account, newsletter form, news index list, color swatch hex values (mapped client-side from option name → CSS color in `app/components/ProductDetails.tsx`).

## Run

```sh
# from the repo root
pnpm install
pnpm --filter @shopify/hydrogen-example-nextjs dev
```

Then open http://localhost:3000.

Note: Next.js 16 does **not** cache `fetch` by default — every request to a server component re-runs the GraphQL call. That's fine for an example but worth knowing if you copy this into something with real traffic.

## Notes for the core SDK

Same shape as the React Router example — every framework port re-invents the same three pieces, so this is the feedback loop into the Hydrogen package in `packages/hydrogen`:

- `storefrontClient.graphql()` in `app/lib/storefront.ts` — now uses `createStorefrontClient` from `@shopify/hydrogen` with `gql.tada` for zero-config type inference. Error normalization and request-id propagation are handled by the core client.
- `formatMoney()` in `app/lib/money.ts` — every example needs money formatting from a `MoneyV2`-shaped object.
- `ProductCard` reads a narrow product shape (`handle`, `title`, `featuredImage`, `priceRange.minVariantPrice`). A core fragment + type for "product card" would let routes share GraphQL fragments instead of re-listing fields.
- Color swatch mapping (`SWATCHES` in `app/components/ProductDetails.tsx`) is hand-rolled — option-value → swatch metadata is a real merchant problem; the SDK should have an opinion on how to expose it.

## Open questions

- **Caching**: Next 16's fetch-isn't-cached default is the right safe default for fresh data, but a real storefront wants per-query cache hints. Should `storefrontClient.graphql()` accept a `revalidate` / tag config, or should that be the framework's problem?
- **Mutations**: cart mutations run through Hydrogen's `/api/cart` route installed by `proxy.ts`, matching the React Router example's `useCartForm` and Standard Actions flow. Next.js Server Actions are still worth evaluating separately, but the example now uses the shared framework-neutral cart path.
