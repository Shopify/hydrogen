# React Router 7 example

<a href="https://admin.shopify.com/hydrogen/new?template=react-router"><img alt="Deploy to Oxygen" src="../../.github/images/deploy-to-oxygen.svg" width="182" height="46"></a>

Port of the canonical `examples/base/` design to [React Router v7](https://reactrouter.com/) (framework mode, SSR enabled by default).

## What this demonstrates

- React Router's server `loader` as the data path — every route fetches its data on the server before rendering.
- Colocated GraphQL queries (the route owns its query and types).
- File-based-ish routes wired through `app/routes.ts` (`index`, `route("collections/:handle", ...)`, `route("products/:handle", ...)`).
- Shared chrome (`Header`, `Footer`) lives at the root layout in `app/root.tsx`, not per-route.
- Tailwind v4 via `@tailwindcss/vite` — the design's `@theme` tokens live in `app/app.css`.

## Pages

| Route | Source | Status |
|---|---|---|
| `/` | `examples/base/index.html` | Live: hero is static; featured products grid pulls from `products(first: 3)` |
| `/collections/:handle` | `examples/base/collections/men/index.html` | Live: queries `collection(handle:)` with up to 24 products |
| `/products/:handle` | `examples/base/products/hoodie/index.html` | Live: gallery, options (Size + Color swatches), add-to-cart UI; "You may also like" pulls from `products(first: 4)` |

## Stubbed vs. live

- **Live**: product data, collection data, prices, images, options, cart state (server-fetched via `createCartServerHandlers().get` in root loader, hydrated into `CartProvider`).
- **Stubbed**: hero links, search, account, newsletter form, color swatch hex values (mapped client-side from option name → CSS color in `app/routes/product.tsx`).

## Run

```sh
# from the repo root
pnpm install
pnpm --filter @shopify/hydrogen-example-react-router dev
```

Then open http://localhost:5173 (Vite will fall back to 5174 if the base example is also running).

## Notes for the core SDK

- `storefrontClient.graphql()` in `app/lib/storefront.ts` — uses `createStorefrontClient` from `@shopify/hydrogen` with typed query support via `gql()`. Types are inferred directly from query strings against the Storefront API schema — no manual type definitions or casts needed. Error normalization and request-id propagation are handled by the core client.
- `formatMoney()` in `app/lib/money.ts` — every example will need money formatting from a `MoneyV2`-shaped object.
- `ProductCard` reads a narrow product shape (`handle`, `title`, `featuredImage`, `priceRange.minVariantPrice`). A core fragment + type for "product card" would let routes share GraphQL fragments instead of re-listing fields.
- Color swatch mapping (`SWATCHES` in `app/routes/product.tsx`) is hand-rolled — option-value → swatch metadata is a real merchant problem; the SDK should have an opinion on how to expose it.

## Open questions

- **Mutations**: all cart mutations (add, increase, decrease, remove, discount, note) work with JavaScript disabled via `useCartForm` and the `/api/cart` endpoint. With JS enabled, form submissions are intercepted for optimistic UI via Standard Actions.
