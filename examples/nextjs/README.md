# Next.js example

A [Next.js 16](https://nextjs.org) (App Router, Turbopack, React 19.2) storefront example built on `@shopify/hydrogen`, translating the `examples/core` design into Next.js with server components and a Cache Components prerender.

## What this is

A working storefront slice — home, collections, product pages, search, cart, customer accounts, sitemap, and robots — that exercises Hydrogen's request lifecycle, Storefront API client, cart, and Customer Account handlers inside Next.js's App Router + middleware model. It runs with zero secrets against mock.shop, or against a real Shopify store when a private token is provisioned.

## Requirements

- Node.js 24+
- pnpm (the repo is a pnpm workspace)

## Quick start (zero secrets)

From the repo root:

```sh
pnpm install
pnpm --filter @shopify/hydrogen-example-nextjs dev
```

With no `PRIVATE_STOREFRONT_API_TOKEN` present, the example falls back to [mock.shop](https://mock.shop) using its well-known `mock-private-token`, so it runs immediately with no store configuration. A console warning reminds you that customer accounts and real-store features are unavailable in this mode.

Then open http://localhost:3000.

## Point it at your store

To run against a real Shopify store instead of mock.shop, create a private
Storefront API token in your Shopify admin and set it as an environment variable:

```sh
export PRIVATE_STOREFRONT_API_TOKEN=<your-private-storefront-api-token>
export PUBLIC_STORE_DOMAIN=<your-shop>.myshopify.com
pnpm --filter @shopify/hydrogen-example-nextjs dev
```

See the [Storefront API docs](https://shopify.dev/docs/api/storefront) for creating
a token. With `PRIVATE_STOREFRONT_API_TOKEN` set, the example uses your store
instead of mock.shop; `PUBLIC_STORE_DOMAIN` overrides the bundled demo store domain.

## Customer Accounts (optional)

Customer Accounts require an HTTPS origin (Shopify OAuth rejects `http`) and a real store (mock.shop has no Customer Account API).

Set `PRIVATE_STOREFRONT_API_TOKEN` (and `PUBLIC_STORE_DOMAIN`) to your store — see [Point it at your store](#point-it-at-your-store) — so the example runs against a real store instead of mock.shop.

Run the HTTPS dev server and open <https://localtest.me:5173>:

```sh
pnpm --filter @shopify/hydrogen-example-nextjs https:dev
```

Next.js provisions and reuses a trusted development certificate under `certificates/`. On first run, it may prompt to install the local certificate authority.

The `/account` page shows your name + email. The header account link is hidden on mock.shop and shown only when a real store is configured.

## What's included

- **`/` (home)** — Live: hero is static; featured products grid pulls from `products(first: 8)` and featured collections from `collections(first: 3)`.
- **`/collections`** — Live: queries `collections(first: 24)`.
- **`/collections/[handle]`** — Live: queries `collection(handle:)` with URL-synced filters, sort, and active filter chips.
- **`/products/[handle]`** — Live: gallery, URL-synced variant options, add-to-cart, Shop Pay, and related products.
- **`/search`** — Live: storefront `search()` with filters, sort, pagination, and predictive search.
- **`/cart`** — Live: cart page (the drawer's fallback route) with optimistic line updates, discount codes, totals, checkout, and Shop Pay.
- **`/account`** — Live (real store only): Customer Account OAuth session, basic customer name/email, logout form. Renders a "requires a real store" notice on mock.shop.
  - `/account/login`, `/account/logout`, `/account/refresh`, `/account/authorize` are Hydrogen-owned routes intercepted in `proxy.ts` (no app route files exist for them) — Customer Account OAuth login/refresh/logout is handled there.
- **`/sitemap.xml`** — Live: Next.js metadata route listing product and collection URLs with `updatedAt`, from a cacheable Storefront query.
- **`/robots.txt`** — Live: Next.js metadata route allowing all crawlers, pointing to the sitemap, disallowing `/cart` and `/api/`.

Stubbed: hero links, newsletter form, color swatch hex values (mapped from option name to CSS color).

### Framework highlights

- **Request lifecycle:** `proxy.ts` runs `handleShopifyRoutes` before framework routing — Hydrogen-owned routes (`/api/cart`, `/api/predictive-search`, `/api/{ver}/graphql.json`, `/admin`, …) short-circuit there. Storefront URL redirects run in `app/not-found.tsx` (post-404), since the proxy cannot inspect the routed response. The original request URL is forwarded to Server Components via an `x-storefront-url` header.
- **Two Storefront clients:** a module-scoped `staticStorefrontClient` (shared rate-limit bucket, no buyer IP) serves all catalog reads — home, collections, product, search, sitemap. A per-buyer `getStorefrontClient()` (request-scoped via React's `cache()`, reads `headers()`) is used only for the cart seed in the per-request `AppShell`, since the cart is personalized.
- **Cache Components prerender:** with `cacheComponents: true`, the root layout is a static shell that prerenders the `<html>`/`<body>` and announcement bar, then wraps the per-request `AppShell` in `<Suspense>`. The per-buyer cart seed is passed as async `CartProvider` initial data and cart content uses a local Suspense boundary, so the static shell prerenders while hydrated per-buyer cart UI waits behind a cart-specific fallback.
- **Markets:** `getMarketFromHeaders` reads the forwarded `x-storefront-url` to resolve a market; the Storefront client auto-injects the matching `$country`/`$language` context (never passed as query variables). This is a single-market example, but the helper is wired so multi-market is an extension, not a rewrite.
- **Caching:** Next-native `use cache` with `cacheLife`/`cacheTag` cache-points keyed by serializable inputs. No Oxygen sub-request LRU.
- **No-JS friendly:** variant selection uses GET links (server-side variant switching), and `/cart` is reachable as a full page.

### Known issue: `--debug-prerender` build flag

The `build` script uses `next build --debug-prerender`. Next.js 16 + React 19.2 has a confirmed framework bug ([vercel/next.js#84994](https://github.com/vercel/next.js/issues/84994), [#86178](https://github.com/vercel/next.js/issues/86178), [#94667](https://github.com/vercel/next.js/discussions/94667)) where the internal `/_global-error` route fails to prerender with `TypeError: Cannot read properties of null (reading 'useContext')`, blocking `next build`. The bug reproduces with no custom error page and is independent of this app's code; the fix requires React 19.3.0 (unreleased). The `--debug-prerender` flag is the only available workaround and produces a complete, valid Partial-Prerender production build (`next start` serves it correctly). Remove the flag once React 19.3.0 ships.

## Next steps

- Hydrogen docs: https://shopify.dev/docs/api/hydrogen
- The frozen design source these examples are built from: [`examples/core/`](../core/)
- What the examples in this repo are and are not: [`examples/README.md`](../README.md)
