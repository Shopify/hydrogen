# React Router storefront example

A React Router 8 (framework mode, SSR) storefront built on
[`@shopify/hydrogen`](https://www.npmjs.com/package/@shopify/hydrogen). It's a
starting point you can clone and build your store on top of — five pages on a
shared layout, with a real cart, analytics, and a consent banner wired up.

## Pages

- `/` — home (editorial hero, best sellers, shop by category)
- `/products/:handle` — product detail (gallery, variants, add to cart)
- `/collections` — all collections
- `/collections/:handle` — collection with filters, sort, and pagination
- `/search` — product search with the same filtering
- `/cart` — cart (also the no-JS fallback for the cart drawer)

## What it demonstrates

- Server `loader`s as the data path; each route owns its GraphQL query (typed via
  `gql.tada`).
- A real cart: storefront client + request handlers + `/api/cart` + an accessible
  cart drawer wired to Shopify Standard Actions.
- A shared layout (header with mobile nav, footer, announcement bar).
- Analytics + a consent banner.
- The design tokens in `app/tokens.css` and SVG icons in `public/icons/`.

## Run it

```bash
pnpm install
```

**Zero-config demo** — runs against `mock.shop` (a public mock Storefront API, no
account or token needed):

```bash
MOCK_SHOP=1 pnpm dev
```

**Against a real store** — set your store domain (in `app/lib/shop.ts`) and a
**private** Storefront API token, then run normally:

```bash
cp .env.example .env   # add your PRIVATE_STOREFRONT_API_TOKEN
pnpm dev               # the dev/start scripts auto-load .env (--env-file-if-exists)
```

The store coordinates in `app/lib/shop.ts` point at Shopify's public **Hydrogen
Preview** store as a placeholder — **replace them with your own store**. Real
(non-mock) mode requires a private Storefront API token for *your* store; the
zero-config `MOCK_SHOP=1` demo above needs none. (`mock.shop` and the Hydrogen
Preview store are different data sources.)

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` | Start the dev server (Vite + SSR). |
| `pnpm build` | Production build. |
| `pnpm start` | Serve the production build. |
| `pnpm typecheck` | React Router typegen + `tsc` + `gql.tada check`. |

## Where to start

- Swap the store in `app/lib/shop.ts` + `.env`.
- Routes live in `app/routes/`; shared UI in `app/components/`; data/query helpers
  in `app/lib/`.
- The design is yours to change — `app/tokens.css` holds the design tokens; the
  components use them via semantic classes.

## License

MIT — see [LICENSE](./LICENSE).
