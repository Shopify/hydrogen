# Astro example

Port of the canonical `examples/base/` design to [Astro](https://astro.build/) running on the Node SSR adapter.

## What this demonstrates

- Astro's `.astro` component model — frontmatter (`---`) for server-side data fetching, template body for markup.
- File-based routing under `src/pages/` (`index.astro`, `collections/[handle].astro`, `products/[handle].astro`, `blogs/news/[handle].astro`).
- On-demand SSR via `@astrojs/node` (`output: "server"`), matching the data path of the React Router and Next.js examples.
- Colocated GraphQL queries (each page owns its query and types in its frontmatter).
- Shared chrome (`Header`, `Footer`) lives in `src/layouts/BaseLayout.astro`, not per-page.
- Tailwind v4 via `@tailwindcss/vite` — the design's `@theme` tokens live in `src/styles/global.css`.

## Pages

| Route | Source | Status |
|---|---|---|
| `/` | `examples/base/index.html` | Live: hero is static; featured products grid pulls from `products(first: 3)` |
| `/collections` | `examples/base/collections/index.html` | Live: queries `collections(first: 12)` |
| `/collections/:handle` | `examples/base/collections/men/index.html` | Live: queries `collection(handle:)` with up to 24 products |
| `/products/:handle` | `examples/base/products/hoodie/index.html` | Live: gallery, options (Size + Color swatches), add-to-cart UI; "You may also like" pulls from `products(first: 4)` |
| `/blogs/news` | `examples/base/blogs/news/index.html` | Live: first article rendered as featured, rest in a 2-col grid |
| `/blogs/news/:handle` | `examples/base/blogs/news/liquidpeak-450/index.html` | Live: article body comes back as `contentHtml` and is rendered with `set:html` |
| `/account` | (new) | Live: Customer Account OAuth session, basic customer name/email, logout form |
| `/account/login` | (new) | Live: Hydrogen Customer Account handler starts OAuth and stores pending PKCE state |
| `POST /account/logout` | (new) | Live: Hydrogen Customer Account handler clears session and redirects with `303 See Other` |

## Stubbed vs. live

- **Live**: product data, collection data, prices, images, options, news articles, article body HTML, Customer Account login/session state, basic customer identity, logout.
- **Stubbed**: hero links, cart count badge, search, add-to-cart button (no cart mutation), newsletter form, color swatch hex values (mapped server-side from option name → CSS color in `src/pages/products/[handle].astro`).

## Customer Account setup

The account flow uses `createCustomerSession` and `createCustomerAccountServerHandlers` from `@shopify/hydrogen/customer-account`, Customer Account values from `examples/shared/config.ts`, and an encrypted HttpOnly `__Host-` cookie adapter from `examples/shared/customer-session.ts`.

Customer Account OAuth requires a public HTTPS origin. To test locally without a tunnel, register `https://localtest.me:5173/account/authorize` as the callback URI and run:

```sh
pnpm https:setup
pnpm --filter @shopify/hydrogen-example-astro https:dev
```

## Run

```sh
# from the repo root
pnpm install
pnpm --filter @shopify/hydrogen-example-astro dev
```

Then open http://localhost:4321.

To build and serve the production output:

```sh
pnpm --filter @shopify/hydrogen-example-astro build
pnpm --filter @shopify/hydrogen-example-astro start
```

`pnpm start` runs the standalone Node server emitted by `@astrojs/node` (`node ./dist/server/entry.mjs`) and listens on port 4321 by default.

## Notes for the core SDK

- `storefrontClient.graphql()` from `Astro.locals.storefrontClient` — uses the request-scoped client created in `src/middleware.ts` with typed query support via `gql()`. Types are inferred directly from query strings against the Storefront API schema — no manual type definitions or casts needed. Error normalization and request-id propagation are handled by the core client.
- `formatMoney()` in `src/lib/money.ts` — every example needs money formatting from a `MoneyV2`-shaped object.
- `ProductCard.astro` reads a narrow product shape (`handle`, `title`, `featuredImage`, `priceRange.minVariantPrice`). A core fragment + type for "product card" would let routes share GraphQL fragments instead of re-listing fields.
- Color swatch mapping (`SWATCHES` in `src/pages/products/[handle].astro`) is hand-rolled — option-value → swatch metadata is a real merchant problem; the SDK should have an opinion on how to expose it.

## Open questions

- **Astro is server-by-default in this example, but its sweet spot is static + islands.** Worth a sibling experiment that flips `output: "static"` and uses `getStaticPaths` to pre-render collections/products at build time, then layers an interactive Add-to-Cart island on top — that would exercise Astro's actual differentiator versus the React Router / Next.js ports.
- **No type-aware `Astro.params`.** The `[handle]` segment is typed as `string | undefined` in the frontmatter — a thin codegen (`astro sync` already runs for content collections; could it also typegen route params?) would close the gap with React Router's `Route.LoaderArgs` and Next.js's typed `params` promise.
- **`@astrojs/node` major needs to track `astro` major.** I initially picked `^9.5.4`, which silently installed alongside `astro@6` and broke the production build with a missing `applyPolyfills` export — pnpm only logs the peer-dep mismatch, doesn't fail. The skill should call out that the Node adapter major number tracks Astro's (Astro 5 → adapter 9, Astro 6 → adapter 10).
