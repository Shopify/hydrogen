# Remix 3 example

> Development example for exercising Hydrogen APIs in Remix 3. This is not a starter template.
> See [`../README.md`](../README.md) for context.

A port of the [`hydrogen/`](../hydrogen) Skeleton to [Remix 3](https://remix.run) running on Oxygen. It uses the framework-neutral `@shopify/hydrogen` core directly, because Hydrogen has no Remix binding. [Pitlane's Vite plugin](https://pitlane.tools/guides/vite-plugin) builds the browser and Worker bundles, and MiniOxygen runs the Worker for `vite dev` and `vite preview`.

## Run

```sh
# from the repo root
pnpm install
pnpm run build:pkgs
cp examples/remix/.env.example examples/remix/.env
pnpm --filter @shopify/hydrogen-example-remix dev
```

`.env.example` works as is: without `PRIVATE_STOREFRONT_API_TOKEN`, the Storefront client falls back to the public token. Run `pnpm run examples:secrets:decrypt` to add the private token and get buyer-aware server rendering.

| Script | What it does |
| --- | --- |
| `dev` | `vite dev` with HMR, served by MiniOxygen |
| `dev:https` | `vite dev` on `https://local.tryhydrogen.dev:5173` for Customer Account OAuth |
| `build` | Builds `dist/client` and a single self-contained Worker at `dist/server/index.js` |
| `preview` | Builds, then serves the production Worker with MiniOxygen |
| `test` | Unit tests with Remix's test runner (`remix test`), colocated as `app/**/*.test.ts`: discount redirects, locale resolution, and account form schemas |
| `typecheck` | `tsc`, `hydrogen gql check` for every `gql()` document, then `remix doctor --strict` for the project's Remix conventions |

## Routes

Every route also matches under a locale prefix (`/en-ca`, `/fr-ca`), like the Skeleton's `($locale)` segment.

| Route | Notes |
| --- | --- |
| `/` | Featured collection. Recommended products stream in afterwards through a `<Frame>` that loads `/recommended-products`, like the Skeleton's deferred loader data |
| `/collections`, `/collections/all`, `/collections/:handle` | Cursor pagination as plain links |
| `/products/:handle` | Variant options as GET links; add to cart opens the cart drawer |
| `/cart` | Server-rendered from the cart handler; the same component as the drawer |
| `/search` | Full search. The header's Search opens predictive search in an aside |
| `/blogs`, `/blogs/:blogHandle`, `/blogs/:blogHandle/:articleHandle` | |
| `/pages/:handle`, `/policies`, `/policies/:handle` | |
| `/account`, `/account/orders`, `/account/orders/:id`, `/account/profile`, `/account/addresses` | Customer Account API. Profile and address forms are native POST forms, parsed with `remix/data-schema`. Other `/account/*` paths require login, then redirect to `/account` |
| `/discount/:code` | Applies a discount code, then redirects |
| `/robots.txt`, `/sitemap.xml`, `/sitemap/:type/:page.xml` | |

`handleShopifyRoutes` answers the Shopify-owned routes before the Remix router runs: `/api/cart`, `/api/predictive-search`, `/account/login`, `/account/authorize`, `/account/refresh`, `/account/logout`, cart permalinks, `?variant=` redirects, `/.well-known/ucp`, and the Storefront API proxy. After the router returns a 404, `handleShopifyRedirects` checks for a Shopify redirect.

## How it fits together

| File | Responsibility |
| --- | --- |
| `app/entry.server.ts` | The Oxygen Worker. Builds the app for each request with that request's `env`, cache, and `waitUntil` |
| `app/router.ts` | Middleware order and controller mapping. An inner error boundary turns errors and thrown redirects into responses before the session saves, and an outer one catches middleware failures |
| `app/routes.ts` | The typed URL contract (`remix/routes`). Links, form actions, and redirects use `routes.*.href()` with the active locale's prefix |
| `app/middleware/locale.ts` | Resolves the locale prefix, then routes the prefix-free path |
| `app/middleware/shopify.ts` | Request context, Storefront client, customer session, `handleShopifyRoutes`, and post-404 redirects. `shopifyResponseHeaders()` applies Hydrogen's response headers outside the session middleware, after its cookie is set |
| `app/middleware/layout.ts` | Starts loading the shell (menus, cart, login state) in parallel with the page's own queries. Frame subrequests skip it |
| `app/middleware/customer-auth.ts` | A `remix/middleware/auth` scheme over Hydrogen's Customer Account session. `requireCustomer()` protects the account controller, sends anonymous requests to Hydrogen's login handler, and gives actions the access token as `context.auth.identity` |
| `app/middleware/browsing-cache.ts` | Lets the browser reuse an opted-in page's client navigation for 5 seconds, so prefetched pages serve the click that follows. It runs outside Hydrogen's response headers and the session |
| `app/middleware/render.tsx` | Wraps Remix's streaming renderer so every page renders inside the app shell. `context.renderFragment()` renders frame content without it |
| `app/actions/**` | Controllers and their pages |
| `app/assets/public/**` | `clientEntry()` islands: cart, product form, header, predictive search, analytics |
| `app/assets/public/app.css` | Global styles only: element defaults and design tokens in `@layer base`, plus `.sr-only`. Component styles are `css()` mixins next to their components, which Remix emits in the `rmx` cascade layer after `base`. Shared ones live in `app/ui/public/styles.ts` |
| `app/asset-sources.ts` | The browser boundary. Vite fails when browser code imports anything outside `app/**/public/**` and `app/routes.ts` |
| `vite/remix-oxygen.ts` | Pitlane's plugin, plus a post-build step that inlines its asset manifest into the one Worker file Oxygen deploys |

Hydrogen primitives in use:

- **Cart.** One browser `createCartStore` shared by the drawer, the `/cart` page, the header count, and the product form. Line forms follow the Hydrogen contract (hidden `set` button first, editable quantity input with `attachQuantityInput`, increase, decrease, and remove submitters), so the cart page and drawer forms also work without JavaScript. Add to cart on the product page stays disabled until its island hydrates, as in the Skeleton.
- **Product form.** `createProductFormStore` drives option state. On the server it runs against an empty cart store, so the first HTML already shows the selected variant. Option values are links; a hydrated click selects the variant locally, then replaces the URL with one in-place navigation.
- **Predictive search.** `createPredictiveSearchStore` against Hydrogen's `/api/predictive-search` handler, inside a native `GET /search` form.
- **Customer accounts.** Remix's cookie session middleware backs Hydrogen's session manager contract, so Hydrogen's OAuth handlers write to the request's session and Remix commits the cookie. Remix's auth middleware reads the result through a custom scheme around `getOrRefreshAccessToken`.
- **Analytics.** `getShopifyScriptTags` in the document head, `initializeShopifyScripts` in the browser entry, page views on each top-frame reload, and product, collection, search, and cart view events from small islands.

Links prefetch where the Skeleton's do, with Remix's `data-rmx-prefetch`: the header and footer menus, product and collection cards, the blog list, search results, cart lines, and option links to another product use `"intent"` (hover, focus, or press), and the empty cart's "Continue shopping" link uses `"viewport"`. External menu links aren't marked, and neither is Account, because a signed-out request to it starts the login flow.

A click within 5 seconds of the prefetch reuses it. Hydrogen sends every page `private, no-store`, because the header reads the customer's login state, so catalog handlers opt in with `BROWSING_HEADERS` and `app/middleware/browsing-cache.ts` applies `private, max-age=5` after Hydrogen's headers. Only client navigations (`X-Remix-Frame: true`) that succeed without setting a cookie qualify, and they vary by `Cookie` and Remix's frame headers. Full documents stay uncacheable because they seed the browser cart store. A client navigation renders into a cart store that ignores embedded cart data once it holds a cart, and creating a cart sets a new cookie, so a cached page can't show a stale cart. The cart page and account pages don't opt in.

## Verification

The [storefront E2E suite](../../packages/storefront-e2e) runs against `vite dev` in CI (`.github/workflows/storefront-e2e.yml`), including the no-JavaScript variant checks. It also passes against `vite preview`. To run it locally against a running server:

```sh
STOREFRONT_BASE_URL=http://localhost:5173/ pnpm test:e2e:storefront
```

The collection filter group skips, because the Skeleton's collection page has no filters.

`pnpm test` runs the colocated `*.test.ts` files with `remix test`, using `remix/assert`. The Node version also tests its router, environment, and Storefront cache; those depend on its Node server, so they aren't part of this Oxygen version.

## Vite version

The example uses the monorepo's shared Vite 8.0. Pitlane declares a `vite >=8.1` peer, so `pnpm install` warns. The only 8.1 feature it needs is chunk import maps, which `vite/remix-oxygen.ts` turns off (`chunkImportMap: false`). Dev, build, and preview all work on 8.0.

## Differences from the Skeleton

- **Pagination** uses previous and next page links instead of the Skeleton's client-side "load more" list.
- **Asides** are native `<dialog>` elements instead of a React context.
- **Styles** are split: the Skeleton's `app.css` keeps only global rules, and component rules are `css()` mixins next to their components. The rendered styles match the Skeleton's stylesheet.
- **Carts aren't connected to the signed-in customer.** Cart handlers are created without `customerSession`, like the other examples, so checkout isn't pre-authenticated and login doesn't attach the cart. See the dual package hazard below.
- **Cart delivery instructions** (the Skeleton's cart metafield route) aren't ported. The gift message cart attribute is.
- **Custom consent banner.** The Skeleton's `consent.custom-banner` route and custom-banner consent mode aren't ported; analytics uses Shopify's `no-banner` mode.
- **Content Security Policy** headers and nonces aren't ported.
- **Mock.shop** isn't supported; the example targets the shared `hydrogen-preview` store.
- **Dependencies.** The build relies on `@pitlane/vite-plugin-remix` and `@pitlane/assets`, third-party pre-1.0 packages, pinned to exact versions.

## Notes for the core SDK

- **Dual package hazard under `vite dev`.** Passing `cartServerHandlers` to `createCustomerAccountServerHandlers` throws "cartServerHandlers must be created by createCartServerHandlers with the customerSession option". `@shopify/hydrogen` resolves to `dist/development/core` through the `development` condition, but `dist/customer-account` imports `dist/core`, so the cart buyer identity symbol exists twice. A likely fix is a `development` condition for `./customer-account`, built alongside the development core. Until then, the example creates its cart handlers without `customerSession`: wiring `customerSession` alone would attach the customer to new carts without detaching them on logout.
- **Controlled inputs.** Remix restores a controlled input's `value` after each `input` event, so the cart quantity input keeps a local draft. A framework-neutral note in the `hydrogen-cart-ui` skill would help: `register("quantity", { interactive: true })` returns `value`, which is controlled in Remix as in React.
- **`clientEntry()` props must be serializable.** Hydrogen's cart types keep open index signatures for custom fragment fields, which don't type-check as island props. `app/lib/cart.ts` maps them to a serializable type.
