# SolidStart example

Port of the canonical `examples/base/` design to [SolidStart](https://start.solidjs.com/) v1 (Vinxi + Solid Router, SSR enabled by default).

## What this demonstrates

- **Signals as a first-class citizen.** `createSignal` drives the product detail page's selected size, color, and quantity — no virtual DOM, no `useState`, no batching. The reactive primitive is the model.
- **`query` + `createAsync` as the data path.** Each route defines a server-side `query`, exports a `route.preload` so the router can kick the fetch off during navigation, and reads the result with `createAsync()` — Solid's idiomatic SSR-aware fetcher.
- **`"use server"` on every fetcher.** Storefront API calls run on the server during SSR and on subsequent client navigations are issued as RPC, not from the browser.
- **File-based routing via `FileRoutes`.** `src/routes/` is the source of truth — folder layout maps directly to URL paths, including `[handle].tsx` dynamic params.
- **Shared chrome (`Header`, `Footer`) at the root.** Mounted in `src/app.tsx`'s `Router` root, not duplicated per-route.
- **Tailwind v4 via `@tailwindcss/vite`.** The design's `@theme` tokens live in `src/app.css`.

## Pages

| Route                  | Source                                               | Status                                                                                      |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                    | `examples/base/index.html`                           | Live: hero is static; featured products grid pulls from `products(first: 3)`                |
| `/collections`         | `examples/base/collections/index.html`               | Live: queries `collections(first: 12)`                                                      |
| `/collections/:handle` | `examples/base/collections/men/index.html`           | Live: queries `collection(handle:)` with up to 24 products                                  |
| `/products/:handle`    | `examples/base/products/hoodie/index.html`           | Live: gallery, options, add-to-cart UI; "You may also like" pulls from `products(first: 4)` |
| `/blogs/news`          | `examples/base/blogs/news/index.html`                | Live: featured article + grid from `blog(handle:"news").articles`                           |
| `/blogs/news/:handle`  | `examples/base/blogs/news/liquidpeak-450/index.html` | Live: title, date, `contentHtml` rendered via `innerHTML`                                   |

## Stubbed vs. live

- **Live:** product, collection, blog, and article data; prices; images; options.
- **Signal-driven (interactive on the product page):** selected size, selected color, quantity (`createSignal` in `src/routes/products/[handle].tsx`).
- **Stubbed:** hero links, cart count badge, search, account, add-to-cart button (no cart mutation), newsletter form, color swatch hex values (mapped client-side from option name → CSS color in `src/routes/products/[handle].tsx`).

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
- Color swatch mapping (`SWATCHES` in `src/routes/products/[handle].tsx`) is hand-rolled — option-value → swatch metadata is a real merchant problem; how should the SDK expose it?

## Open questions

- **`createSignal` inside a `Show` render-prop.** The product page initializes selected size/color/qty inside the `<Show when={data()}>` render function, because the signal initial values come from the loaded product. This works, but it means the signals don't survive a re-mount of the `Show` (e.g. param change → fresh signals). Whether that's the right Solid-ism here or whether the data should be lifted into a `createResource` outside is worth a second pass.
- **Mutations.** This example only reads. Cart mutations (`cartCreate`, `cartLinesAdd`) would exercise Solid's `action` / form-action story — worth doing in a follow-up.
- **`SERVER_HOST` env handling.** If the kit ever ships a recommended-config preset, baking the host override into `app.config.ts` instead of the script line might be cleaner — but it's a Shopify-machine-specific workaround, so keeping it out of the framework config feels right for now.
