# SolidStart example

Port of the canonical `examples/base/` design to [SolidStart](https://start.solidjs.com/) v1 (Vinxi + Solid Router, SSR enabled by default).

## What this demonstrates

- **Signals as a first-class citizen.** `createSignal` drives cart, product form, and collection browse state derived from Hydrogen's core stores — no virtual DOM, no `useState`, no batching. The reactive primitive is the model.
- **`query` + `createAsync` as the data path.** Each route defines a server-side `query`, exports a `route.preload` so the router can kick the fetch off during navigation, and reads the result with `createAsync()` — Solid's idiomatic SSR-aware fetcher.
- **`"use server"` on every fetcher.** Storefront API calls run on the server during SSR and on subsequent client navigations are issued as RPC, not from the browser.
- **Core Hydrogen primitives** for cart, product variant selection, collection filtering/sorting, and Shop Pay without framework bindings.
- **File-based routing via `FileRoutes`.** `src/routes/` is the source of truth — folder layout maps directly to URL paths, including `[handle].tsx` dynamic params.
- **Shared chrome (`Header`, `Footer`) at the root.** Mounted in `src/app.tsx`'s `Router` root, not duplicated per-route.
- **Tailwind v4 via `@tailwindcss/vite`.** The design's `@theme` tokens live in `src/app.css`.

## Pages

| Route                  | Source                                               | Status                                                                                      |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                    | `examples/base/index.html`                           | Live: hero is static; featured products grid pulls from `products(first: 3)`                |
| `/collections`         | `examples/base/collections/index.html`               | Live: queries `collections(first: 12)`                                                      |
| `/collections/:handle` | `examples/base/collections/men/index.html`           | Live: queries `collection(handle:)` with filters, sort, and active filter chips             |
| `/products/:handle`    | `examples/base/products/hoodie/index.html`           | Live: gallery, URL-synced variant options, add-to-cart, Shop Pay, and related products      |
| `/cart`                | Hydrogen cart primitive                              | Live: optimistic line updates, discount codes, order note, totals, checkout, and Shop Pay   |
| `/blogs/news`          | `examples/base/blogs/news/index.html`                | Live: featured article + grid from `blog(handle:"news").articles`                           |
| `/blogs/news/:handle`  | `examples/base/blogs/news/liquidpeak-450/index.html` | Live: title, date, `contentHtml` rendered via `innerHTML`                                   |
| `/account`             | (new)                                                | Live: Customer Account OAuth session, basic customer name/email, logout form                 |
| `/account/login`       | (new)                                                | Live: Hydrogen Customer Account handler starts OAuth and stores pending PKCE state           |
| `POST /account/logout` | (new)                                                | Live: Hydrogen Customer Account handler clears session and redirects with `303 See Other`    |

## Stubbed vs. live

- **Live:** product, collection, blog, and article data; prices; images; URL-synced options; cart mutations; collection filters/sort; checkout links; Shop Pay buttons; Customer Account login/session state, basic customer identity, logout.
- **Stubbed:** hero links, search, newsletter form.

## Customer Account setup

The account flow uses `createCustomerSession` and `createCustomerAccountServerHandlers` from `@shopify/hydrogen/customer-account`, Customer Account values from `examples/shared/config.ts`, and an encrypted HttpOnly `__Host-` cookie adapter from `examples/shared/customer-session.ts`.

Customer Account OAuth requires a public HTTPS origin. To test locally without a tunnel, register `https://localtest.me:5173/account/authorize` as the callback URI and run:

```sh
pnpm https:setup
pnpm --filter @shopify/hydrogen-example-solid-start https:dev
```

## Run

```sh
# from the repo root
pnpm install
pnpm --filter @shopify/hydrogen-example-solid-start dev
```

Then open http://localhost:8080.

### Note on `HOST`

The `dev` and `start` scripts inline `HOST=localhost`. Vinxi's port-finder reads `HOST` from the environment to pick a bind target, and Shopify-managed dev machines export `HOST` globally — without the override the dev server tries to bind to that hostname, falls back through alternative ports, and prints an unreachable network URL. Forcing `localhost` keeps it bound where the rest of the examples bind.

## Notes for the core SDK

These are calls/patterns that would benefit from a `@shopify/hydrogen` helper as the core package grows:

- `storefrontClient.graphql()` from `getRequestStorefrontClient()` — now uses the request-scoped client created in `src/middleware.ts` with `gql.tada` for zero-config type inference. Error normalization and request-id propagation are handled by the core client.
- `formatMoney()` in `src/lib/money.ts` — every example will need money formatting from a `MoneyV2`-shaped object.
- `ProductCard` reads a narrow product shape (`handle`, `title`, `featuredImage`, `priceRange.minVariantPrice`). A core fragment + type for "product card" would let routes share GraphQL fragments instead of re-listing fields.
- Option value swatch data is exposed through `createProductFormStore().getState().options[].values[].swatch`, so selectors can render API-backed swatches with `value.swatch`.

## Open questions

- **Framework bindings.** This example intentionally uses core primitives directly. If Solid bindings are added later, compare them against `src/lib/cart.tsx`, `src/components/CollectionBrowser.tsx`, and `src/components/ProductPurchasePanel.tsx`.
- **`SERVER_HOST` env handling.** If the kit ever ships a recommended-config preset, baking the host override into `app.config.ts` instead of the script line might be cleaner — but it's a Shopify-machine-specific workaround, so keeping it out of the framework config feels right for now.
