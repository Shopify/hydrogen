# TanStack Start experiment

> Development experiment for exercising Hydrogen APIs in TanStack Start. This is not a starter template.
> See [`../README.md`](../README.md) for context.

Port of the canonical `experiments/core` design to [TanStack Start](https://tanstack.com/start) (React 19, Vite 8, file-based routing). Feature set matches the React Router and Next.js templates rather than the smaller framework experiments: search and predictive search, sitemap and robots, plus the blog and account routes the sibling experiments carry.

## What this demonstrates

- **One global request middleware owns the Shopify request lifecycle.** `src/server/shopify-middleware.ts` builds the request context, private Storefront client, encrypted customer session and Customer Account client, lets `handleShopifyRoutes` short-circuit Hydrogen-owned routes (`/api/cart`, `/api/predictive-search`, `/account/login|authorize|logout`, `/admin`, …) before routing, threads the context to server functions via `next({ context })`, and after the handler runs commits the session cookie and applies Hydrogen's response headers. It knows nothing about individual routes: `Cache-Control: private, no-store` on `/account` comes from Hydrogen marking the response personalized when the customer session is read.
- **Server functions are the only data path.** Every route loader calls a `createServerFn` in `src/server/*`. Loaders run on the server during SSR and as `/_serverFn/*` RPCs on client-side navigation, so the private Storefront token never reaches the browser. `src/server/storefront-fn.ts` is a base builder that declares `shopifyRequestMiddleware` as a dependency, which types the handler `context` straight from the middleware; Start dedupes the already-executed global middleware instead of running it twice.
- **Not-found and Shopify URL redirects are resolved server-side, in one place.** `src/server/not-found.ts` runs `handleShopifyRedirects` and throws the router's `redirect()` or `notFound()`. Data server functions call it on a miss (one RPC), and the catch-all `$` route wraps it in a server function. It works identically on hard loads and client-side navigations, which a middleware-level "404 then redirect" gate cannot do because RPC requests carry the `/_serverFn/*` URL rather than the page URL.
- **A URLSearchParams-based search encoding.** TanStack Router JSON-encodes search values by default; Hydrogen's URL helpers speak `URLSearchParams` and rely on repeated keys for multi-value filters. `src/lib/search-params.ts` owns the router's `parseSearch`/`stringifySearch` so `location.searchStr` round-trips unchanged and server functions hand the raw string to `parseCollectionParams`/`getSelectedProductOptions`.
- **Server routes for machine endpoints.** `/sitemap.xml` and `/robots.txt` are file routes with `server.handlers.GET`; the sitemap declares `shopifyRequestMiddleware` to get the typed storefront client.
- **React bindings from `@shopify/hydrogen/react`** for cart, collection browse, predictive search, product form, Shop Pay and Shopify scripts. `<ShopifyScripts navigate routes>` in the shell adapts to `useNavigate`.

## Pages

| Route                         | Status                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `/`                           | Live: hero, best sellers, shop by category                                               |
| `/collections`                | Live: `collections(first: 12)` with cursor pagination                                    |
| `/collections/$handle`        | Live: filters (incl. multi-value), sort, active filter chips, load more via server fn    |
| `/products/$handle`           | Live: gallery, URL-synced variant options, add to cart, Shop Pay, streamed related items |
| `/search`                     | Live: `search(query:)` with filters/sort/load more; empty term renders the form only     |
| `/cart`                       | Live: full-page cart on the same store the drawer uses                                   |
| `/blogs/news`                 | Live: `blog(handle: "news")` articles                                                    |
| `/blogs/news/$handle`         | Live: `articleByHandle`, `contentHtml` rendered as HTML                                  |
| `/account`                    | Live: Customer Account session (`getOrRefreshAccessToken`), identity, login/logout      |
| `/sitemap.xml`, `/robots.txt` | Live: server routes; sitemap truncates at 250 products/collections (see below)           |
| `*`                           | Live: Shopify URL redirects, then 404                                                    |

Predictive search lives in the header (`PredictiveSearchTrigger`), backed by `GET /api/predictive-search`.

## Run

```sh
# from the repo root
pnpm install
pnpm run experiments:secrets:decrypt   # writes PRIVATE_STOREFRONT_API_TOKEN into experiments/tanstack-start/.env
pnpm dev:tanstack                  # or: pnpm --filter @shopify/hydrogen-experiment-tanstack-start dev
```

`pnpm build` emits `dist/client` and a fetch-style server entry at `dist/server/server.js`; `pnpm start` serves it with [`srvx`](https://srvx.h3.dev) (`--prod` sets `NODE_ENV=production`, so requests need a forwarded buyer IP header like any deployment behind a proxy). Nitro is intentionally not used, see below.

`pnpm typecheck` runs `tsr generate && tsc`, so a fresh clone typechecks without a prior `dev`/`build`. `src/routeTree.gen.ts` is gitignored.

## Customer Account setup

Customer Account OAuth requires an HTTPS origin. To test locally without a tunnel, register `https://local.tryhydrogen.dev:5173/account/authorize` as the callback URI and run:

```sh
pnpm --filter @shopify/hydrogen-experiment-tanstack-start dev:https
```

The Hydrogen Vite plugin provisions the certificate on first run; no restart was needed in testing because TanStack Start's dev server is Vite's own server. Over plain `http` the `/account/login` route responds 500 with Hydrogen's "OAuth origin must use HTTPS" error, as on every sibling.

## Notes for the core SDK

Friction surfaced while building this port. Candidates for the SDK, docs, or skills:

- **`CartData` index signatures vs. TanStack's serializable-return check.** Hydrogen's cart types keep `[key: string]: unknown` so custom fragments can add fields; Start's `createServerFn` type-checks return values for serializability and rejects `unknown`. `src/lib/serializable.ts` strips the index signatures structurally (no assertion). An SDK-provided "wire" type for cart data would remove the need.
- **`parseCollectionParams` output is not assignable to the Storefront API `ProductFilter` input.** Hydrogen's `ProductFilter` (Standard Events contract) has optional metafield/option `value`s and a `taxonomyMetafield` without `namespace`; the API input requires them. `src/server/filters.ts` drops filters the API would reject. The React Router template casts instead.
- **No public `getStandardRoute`.** Server functions need to rebuild storefront paths from their params to resolve redirects; `src/lib/route-templates.ts` hand-rolls `productPath()` and friends because the helper that knows the route templates is internal.
- **Redirect lookups are uncached.** Every miss costs one `urlRedirects` Storefront API query; a `cache:` strategy on `handleShopifyRedirects` would help 404 storms.
- **Form POSTs to Hydrogen handlers sit outside Start's CSRF middleware.** `createCsrfMiddleware` is scoped to server functions; `/api/cart` and `/account/logout` are served before routing by `handleShopifyRoutes`.

## Notes for TanStack Start

- **Nitro's dev proxy breaks HTTPS origins.** With `nitro()` in the plugin list, the dev proxy forwards to an internal worker and rewrites `Host` to `127.0.0.1:<port>` without `x-forwarded-*`, so Hydrogen saw an `http` origin over `dev:https` and Customer Account login failed. Nitro is one optional adapter in the current hosting docs; this project uses Start's own dev server and `srvx` for production instead.
- **`Register.config` and `Register.router` together resolve the global context to `never`.** Registering the start instance to type `getGlobalStartContext()` works alone, but adding the router registration creates a type cycle. Declaring the request middleware as a dependency of each server function (`storefrontFn`) types `context` without the registry.
- **Plain exports in a server-function module must avoid server-only imports.** Start strips server function *handlers* from the client bundle but not module-level imports used by plain exported functions; `throwNotFoundOrRedirect` takes the request from middleware context rather than calling `getRequest()`.
- **`loader` must be declared before `head` in a file route** for `loaderData` to be typed inside `head()`.
- **`useNavigate`/`Link` reject a fully built href without `to`** unless the target is `"."`; filter chips and load-more navigate with `to: "."` plus `search`, and predictive search items use `router.navigate({ href })`.

## Open questions

- **Sitemap pagination.** The Storefront API caps connections at 250 per page; larger catalogs need a sitemap index. Kept single-page on purpose.
- **Hydration-time cart state.** The root loader seeds `CartProvider` from `cartHandlers.get` on the first document only (`staleTime: Infinity`); after that the cart store is client-authoritative. Compare with the Next.js template's Suspense-seeded promise if streaming the cart becomes interesting.
