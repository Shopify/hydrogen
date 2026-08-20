# Hydrogen React Router template

[![Deploy to Oxygen](../../.github/images/deploy-to-oxygen.svg)](https://admin.shopify.com/hydrogen/new?template=react-router)

A React Router 7 (framework mode, SSR) storefront built on
[`@shopify/hydrogen`](https://www.npmjs.com/package/@shopify/hydrogen) and the
Oxygen runtime through Vite and Mini Oxygen. It's a starting point you can clone
and build your store on top of, with a shared layout, a real cart,
analytics, and a consent banner wired up.

## Pages

- `/` — home (editorial hero, best sellers, shop by category)
- `/products/:handle` — product detail (gallery, variants, add to cart, Shop Pay)
- `/collections` — all collections
- `/collections/:handle` — collection with filters, sort, and pagination
- `/search` — product search with the same filtering
- `/cart` — cart with Shop Pay
- `/account` — optional Customer Account login and identity

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
npm install
```

**Zero-config demo** — runs against `mock.shop` (a public mock Storefront API, no
account or token needed):

```bash
npm run dev
```

**Against a real store** — set your store domain, storefront ID, and a **private**
Storefront API token, then run normally. `.env.example` is the complete environment reference.

```bash
cp .env.example .env
npm run dev
```

Customer Accounts are enabled for real stores when the account values documented in `.env.example` are present. Generate a session secret with `openssl rand -hex 32`.

Customer Account OAuth requires trusted local HTTPS. Run:

```bash
npm run dev:https
```

The local HTTPS plugin provisions and reuses a trusted certificate under `~/.shopify/hydrogen/certs/`. On first run, it may prompt to install the local certificate authority. Open <https://local.tryhydrogen.dev:5173>.

The HTTPS dev server prints the exact Customer Account callback URI, JavaScript
origin, and logout URI to register for the storefront in Shopify admin.

Mode is **auto-detected**: a private Storefront API token selects real-store mode;
without one, the app uses mock.shop. Real-store identity is all-or-nothing, so
incomplete variables fail with an actionable configuration error. `MOCK_SHOP=1`
forces the mock explicitly.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with Mini Oxygen. |
| `npm run dev:https` | Start the Vite dev server with trusted local HTTPS. |
| `npm run build` | Production React Router build for Oxygen. |
| `npm run preview` | Build and preview locally with Vite and Mini Oxygen. |
| `npm run deploy` | Deploy to Oxygen with the Shopify CLI. |
| `npm run typecheck` | React Router typegen + TypeScript + Hydrogen GraphQL checks. |

## Where to start

- Configure a real store in `.env`.
- Routes live in `app/routes/`; shared UI in `app/components/`; data/query helpers
  in `app/lib/`.
- The design is yours to change — `app/tokens.css` holds the design tokens; the
  components use them via semantic classes.

## License

MIT — see [LICENSE](./LICENSE).
