# Hydrogen React Router template

<a href="https://admin.shopify.com/hydrogen/new?template=react-router"><img alt="Deploy to Oxygen" src="https://raw.githubusercontent.com/Shopify/hydrogen/preview/.github/images/deploy-to-oxygen.svg" width="182" height="46"></a>

A React Router 7 (framework mode, SSR) storefront built on
[`@shopify/hydrogen`](https://www.npmjs.com/package/@shopify/hydrogen) and the
Oxygen runtime through Vite and Mini Oxygen. It's a starting point you can clone
and build your store on top of — five pages on a shared layout, with a real cart,
analytics, and a consent banner wired up.

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
npm install
```

**Zero-config demo** — runs against `mock.shop` (a public mock Storefront API, no
account or token needed):

```bash
cp .env.example .env
# uncomment MOCK_SHOP=1 in .env
npm run dev
```

**Against a real store** — set your store domain and a **private** Storefront API
token, then run normally:

```bash
cp .env.example .env   # set PUBLIC_STORE_DOMAIN + PRIVATE_STOREFRONT_API_TOKEN
npm run dev               # Vite/Mini Oxygen loads .env into the worker environment
```

Customer Account OAuth requires trusted local HTTPS. Follow the bundled `hydrogen-local-https` skill to create the default certificates, then run:

```bash
npm run https:dev
```

Open <https://local.tryhydrogen.dev:5173>.

Mode is **auto-detected**: when a `PRIVATE_STOREFRONT_API_TOKEN` is present the
app talks to the real store (`PUBLIC_STORE_DOMAIN`, falling back to the default in
`app/lib/shop.ts`); with none it falls back to the `mock.shop` demo, so a fresh
deploy always renders. **On Oxygen, a linked storefront injects these env vars
automatically** — the deployed site connects to your store with no extra config
(and shows the `mock.shop` demo until it's linked). `MOCK_SHOP=1` forces mock.
(`mock.shop` and the Hydrogen Preview store are different data sources.)

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with Mini Oxygen. |
| `npm run https:dev` | Start the Vite dev server with trusted local HTTPS. |
| `npm run build` | Production React Router build for Oxygen. |
| `npm run preview` | Build and preview locally with Vite and Mini Oxygen. |
| `npm run deploy` | Deploy to Oxygen with the Shopify CLI. |
| `npm run typecheck` | React Router typegen + TypeScript + Hydrogen GraphQL checks. |

## Where to start

- Swap the store in `app/lib/shop.ts` + `.env`.
- Routes live in `app/routes/`; shared UI in `app/components/`; data/query helpers
  in `app/lib/`.
- The design is yours to change — `app/tokens.css` holds the design tokens; the
  components use them via semantic classes.

## License

MIT — see [LICENSE](./LICENSE).
