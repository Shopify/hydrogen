# React Router example

A [React Router v7](https://reactrouter.com) storefront example built on `@shopify/hydrogen`, translating the `examples/core` design into React Router with server loaders and root middleware.

## What this is

A working storefront slice — home, collections, product pages, search, cart, customer accounts, sitemap, and robots — that exercises Hydrogen's request lifecycle, Storefront API client, cart, and Customer Account handlers inside React Router's middleware + loader model. It runs with zero secrets against mock.shop, or against a real Shopify store when a private token is provisioned.

## Requirements

- Node.js 24+
- pnpm (the repo is a pnpm workspace)

## Quick start (zero secrets)

From the repo root:

```sh
pnpm install
pnpm --filter @shopify/hydrogen-example-react-router dev
```

With no `PRIVATE_STOREFRONT_API_TOKEN` present, the example falls back to [mock.shop](https://mock.shop) using its well-known `mock-private-token`, so it runs immediately with no store configuration. A console warning reminds you that customer accounts and real-store features are unavailable in this mode.

Then open http://localhost:5173.

## Point it at your store

To run against a real Shopify store instead of mock.shop, create a private
Storefront API token in your Shopify admin and set it as an environment variable:

```sh
export PRIVATE_STOREFRONT_API_TOKEN=<your-private-storefront-api-token>
export PUBLIC_STORE_DOMAIN=<your-shop>.myshopify.com
pnpm --filter @shopify/hydrogen-example-react-router dev
```

See the [Storefront API docs](https://shopify.dev/docs/api/storefront) for creating
a token. With `PRIVATE_STOREFRONT_API_TOKEN` set, the example uses your store
instead of mock.shop; `PUBLIC_STORE_DOMAIN` overrides the bundled demo store domain.

## Customer Accounts (optional)

Customer Accounts require an HTTPS origin (Shopify OAuth rejects `http`) and a real store (mock.shop has no Customer Account API).

One-time setup:

1. `pnpm https:setup` (repo root) — trusts `mkcert` and creates the `.cert/localtest.me*` certificates.
2. Set `PRIVATE_STOREFRONT_API_TOKEN` (and `PUBLIC_STORE_DOMAIN`) to your store — see [Point it at your store](#point-it-at-your-store) — so the example runs against a real store instead of mock.shop.

Run the HTTPS dev server and open <https://localtest.me:5173>:

```sh
pnpm --filter @shopify/hydrogen-example-react-router https:dev
```

The `/account` page shows your name + email. The header account link is hidden on mock.shop and shown only when a real store is configured.

## What's included

- **`/` (home)** — Live: hero is static; featured products grid pulls from `products(first: 8)` and featured collections from `collections(first: 3)`.
- **`/collections`** — Live: queries `collections(first: 24)`.
- **`/collections/:handle`** — Live: queries `collection(handle:)` with URL-synced filters, sort, and active filter chips.
- **`/products/:handle`** — Live: gallery, URL-synced variant options, add-to-cart, Shop Pay, and related products.
- **`/search`** — Live: storefront `search()` with filters, sort, pagination, and predictive search.
- **`/cart`** — Live: server-rendered cart page (the drawer's no-JS fallback) with optimistic line updates, discount codes, a gift-message cart attribute, totals, checkout, and Shop Pay.
- **`/account`** — Live (real store only): Customer Account OAuth session, basic customer name/email, logout form. Renders a "requires a real store" notice on mock.shop.
  - `/account/login`, `/account/logout`, `/account/refresh`, `/account/authorize` are Hydrogen-owned routes intercepted by the root middleware (no route files exist for them) — Customer Account OAuth login/refresh/logout is handled there.
- **`/sitemap.xml`** — Live: lists product and collection URLs with `updatedAt`, from a cacheable Storefront query.
- **`/robots.txt`** — Live: allows all crawlers, points to the sitemap.
- **`*` (catch-all)** — Live: renders the 404 page; exists so the root middleware runs for every URL (Hydrogen-owned routes like `/api/cart`, `/api/predictive-search`, `/admin`, and the SFAPI proxy).

Stubbed: hero links, newsletter form, color swatch hex values (mapped from option name to CSS color).

### Framework highlights

- **Root middleware (`app/lib/storefront-middleware.ts`)** is the single Hydrogen request lifecycle entry point. Each request flows: `handleShopifyRoutes()` runs before framework routing (Hydrogen-owned routes short-circuit here) → the React Router router runs (`next()`) → `handleShopifyRedirects()` runs only after a 404, honoring Shopify URL redirects before the 404 page renders.
- **One request-scoped private Storefront client** is created per request and shared by all loaders, cart handlers, and predictive-search handlers. A module-level LRU cache wraps non-personalized catalog reads (home, collections, product, search, sitemap); personalized reads (cart, buyer-context state) bypass the cache.
- **Catch-all route** ensures the middleware fires for every URL, so the SFAPI proxy and Hydrogen-owned routes are reachable even for paths React Router would otherwise reject before middleware runs.
- **`/sitemap.xml` and `/robots.txt`** are resource routes built from cacheable Storefront queries.
- **No-JS friendly:** variant selection uses GET links (server-side variant switching), and `/cart` is reachable as a full page.

## Next steps

- Hydrogen docs: https://shopify.dev/docs/api/hydrogen
- The frozen design source these examples are built from: [`examples/core/`](../core/)
- What the examples in this repo are and are not: [`examples/README.md`](../README.md)
