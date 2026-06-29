# Next.js storefront example

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Shopify/hydrogen/tree/preview/templates/nextjs)

A Next.js 16 App Router storefront built on [`@shopify/hydrogen`](https://www.npmjs.com/package/@shopify/hydrogen) for the Node.js runtime and Vercel. It's a standalone starting point you can clone and build your store on top of — five storefront pages on a shared layout, with a real cart, analytics, and a consent banner wired up.

## Pages

- `/` — home (editorial hero, best sellers, shop by category)
- `/products/:handle` — product detail (gallery, variants, add to cart)
- `/collections` — all collections
- `/collections/:handle` — collection with filters, sort, and pagination
- `/search` — product search with the same filtering
- `/cart` — cart (also the no-JS fallback for the cart drawer)

## What it demonstrates

- Next.js App Router with Server Components as the data path; each page owns its GraphQL query (typed via `gql.tada`).
- A real cart: storefront client + request handlers + `/api/cart` + an accessible cart drawer wired to Shopify Standard Actions.
- A shared layout (header with mobile nav, footer, announcement bar).
- Analytics + a consent banner.
- The design tokens in `app/tokens.css` and SVG icons in `public/icons/`.

## Run it

```bash
pnpm install
pnpm dev
```

**Zero-config demo** — with no environment variables, the app falls back to `mock.shop` (a public mock Storefront API, no account or token needed). `MOCK_SHOP=1` also forces the mock data source explicitly:

```bash
MOCK_SHOP=1 pnpm dev
```

**Against a real store** — set your store domain and a **private** Storefront API token, then run normally:

```bash
cp .env.example .env   # set PUBLIC_STORE_DOMAIN + PRIVATE_STOREFRONT_API_TOKEN
pnpm dev
```

Mode is **auto-detected**: when a `PRIVATE_STOREFRONT_API_TOKEN` is present the app talks to the real store (`PUBLIC_STORE_DOMAIN`, falling back to the default in `app/lib/shop.ts`); with none it falls back to the `mock.shop` demo, so a fresh local run or deploy always renders. `MOCK_SHOP=1` forces mock. (`mock.shop` and the Hydrogen Preview store are different data sources.)

Useful commands:

| Script | Does |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm build` | Build the production Next.js app. |
| `pnpm start` | Start the production server after `pnpm build`. |
| `pnpm lint` | Run ESLint. |
| `pnpm typecheck` | Run `tsc --noEmit` and `gql.tada check`. |

## Deploy to Vercel

1. Push this project to a Git provider.
2. Import it in Vercel.
3. Keep the detected Next.js settings (`next build`; no `vercel.json` needed).
4. Deploy.

A fresh Vercel deploy renders without any environment variables because the storefront data source falls back to `mock.shop`. To connect a real store, add `PUBLIC_STORE_DOMAIN` and `PRIVATE_STOREFRONT_API_TOKEN` in Vercel Project Settings and redeploy. Vercel runs this example on the Node.js runtime that Next.js auto-detects.

## Where to start

- Swap the store in `app/lib/shop.ts` + `.env` (or Vercel environment variables).
- Pages live in `app/`; shared UI in `app/components/`; data/query helpers in `app/lib/`.
- The design is yours to change — `app/tokens.css` holds the design tokens; the components use them via semantic classes.

## License

MIT — see [LICENSE](./LICENSE).
