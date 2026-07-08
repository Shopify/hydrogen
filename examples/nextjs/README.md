# Hydrogen — Next.js (App Router) example

A brand-new Next.js 16 (App Router, Turbopack, React 19.2) storefront example,
translating `examples/core` idiomatically into Next.js and bound to
`@shopify/hydrogen`. Runs on Vercel. Zero secrets required (mock.shop fallback).

## Scripts

- `pnpm --filter @shopify/hydrogen-example-nextjs dev` — dev server (Turbopack).
- `pnpm --filter @shopify/hydrogen-example-nextjs build` — production build.
- `pnpm --filter @shopify/hydrogen-example-nextjs start` — serve the build.
- `pnpm --filter @shopify/hydrogen-example-nextjs typecheck` — `tsc` +
  `gql.tada check --fail-on-warn`.

## Architecture

- **Request lifecycle:** `proxy.ts` (`handleShopifyRoutes` pre-routing +
  forwarded headers + mock.shop fallback) + `app/not-found.tsx`
  (`handleShopifyRedirects` post-404).
- **Storefront client:** `getStorefrontClient()` (per-buyer, cart seed only) +
  `staticStorefrontClient` (shared rate-limit, all catalog reads) — F2. A
  browser-safe `publicStorefrontClient` (`lib/public-storefront.ts`) is provided
  for future client-side Storefront fetches (e.g. TanStack Query); browser
  predictive search currently goes through the same-origin
  `/api/predictive-search` handler instead.
- **Layout:** shared code lives at the top level — `lib/` (storefront clients,
  queries, fragments, cart, analytics, image, money, filters, markets) and
  `components/` (Header, ProductCard, CartDrawer, …). `app/` holds only route
  files. Imports use the `@/` alias (`tsconfig` `"@/*": ["./*"]`).
- **Caching:** Next-native `use cache` + `cacheLife`/`cacheTag` cache-points
  keyed by serializable inputs (`cacheComponents: true`). No Oxygen LRU.
- **Cart seed (F1, F4):** root layout is a static shell wrapping an async
  `AppShell` (cart seed via `Promise.race` + analytics shop) in `<Suspense>` —
  the Cache Components idiom (static shell prerenders, per-buyer parts stream).
- **Markets:** `getMarketFromHeaders` reads `x-storefront-url`; the client
  auto-injects `$country`/`$language` (never passed in query variables).
- **No-JS (F4):** variant GET-links switch variants server-side; cart reachable
  via footer `/cart`; filter forms `method="get"` + explicit `action`.

## mock.shop fallback

When no `PRIVATE_STOREFRONT_API_TOKEN` is present, the example falls back to
`mock.shop` + `mock-private-token` so it runs with zero secrets. Decrypt
secrets (`pnpm examples:secrets:decrypt`) to hit a real store.

## Customer Accounts (local HTTPS + real store)

Customer Accounts require an HTTPS origin (Shopify OAuth rejects `http`) and a
real store (mock.shop has no Customer Account API).

One-time setup:

1. `pnpm https:setup` (repo root) — trusts `mkcert` and creates the
   `.cert/localtest.me*` certificates.
2. `pnpm examples:secrets:decrypt` — provisions `PRIVATE_STOREFRONT_API_TOKEN`
   so the example runs against a real store instead of mock.shop.

Run the HTTPS dev server and open <https://localtest.me:5173>:

```
pnpm --filter @shopify/hydrogen-example-nextjs https:dev
```

The `/account` page shows your name + email. `/account/login`,
`/account/logout`, `/account/refresh`, and `/account/authorize` are
Hydrogen-owned routes intercepted in `proxy.ts` (no app route files exist for
them) — Customer Account OAuth login/refresh/logout is handled there. The
header account link is hidden on mock.shop and shown only when a real store is
configured.

## Build note: `--debug-prerender`

The `build` script uses `next build --debug-prerender`. Next.js 16 +
React 19.2 has a confirmed framework bug
([vercel/next.js#84994](https://github.com/vercel/next.js/issues/84994),
[#86178](https://github.com/vercel/next.js/issues/86178),
[#94667](https://github.com/vercel/next.js/discussions/94667)) where the
internal `/_global-error` route fails to prerender with
`TypeError: Cannot read properties of null (reading 'useContext')`, blocking
`next build`. The bug reproduces with no custom error page and is independent
of this app's code; the fix requires React 19.3.0 (unreleased). The
`--debug-prerender` flag is the only available workaround and produces a
complete, valid Partial-Prerender production build (`next start` serves it
correctly). Remove the flag once React 19.3.0 ships.
