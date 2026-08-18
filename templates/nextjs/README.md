# Next.js Hydrogen Storefront

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShopify%2Fhydrogen%2Ftree%2Fdist-preview%2Ftemplates%2Fnextjs)

A Next.js 16 App Router storefront starter built on [`@shopify/hydrogen`](https://www.npmjs.com/package/@shopify/hydrogen) for Vercel.

It includes home, collections, product pages, search, cart, customer accounts, sitemap, robots, Shopify analytics, and a consent banner. With no private token it falls back to `mock.shop` so the app can render before you connect a store.

## Requirements

- Node.js 24+
- pnpm

## Run Locally

```sh
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

Customer Accounts require an HTTPS origin because Shopify OAuth rejects `http`. Run the HTTPS development server and open <https://local.tryhydrogen.dev:5173>:

```sh
pnpm https:dev
```

Next.js provisions and reuses a trusted development certificate under `certificates/`. On first run, it may prompt to install the local certificate authority.

## Environment Variables

Copy `.env.example` to `.env` when you are ready to connect a real store:

```sh
cp .env.example .env
```

Server-only values:

- `PRIVATE_STOREFRONT_API_TOKEN`: private Storefront API token for your store.
- `SESSION_SECRET`: random secret with at least 32 characters, used for Customer Account sessions.
- `SITE_ORIGIN`: canonical storefront origin for metadata, for example `https://your-store.com`.

Generate a session secret with:

```sh
node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
```

Public values:

- `NEXT_PUBLIC_STORE_DOMAIN`: your `myshopify.com` domain.
- `NEXT_PUBLIC_STOREFRONT_API_TOKEN`: public Storefront API token, used only by browser-safe clients.
- `NEXT_PUBLIC_SHOP_ID`: numeric Shopify shop ID for analytics and Customer Accounts.
- `NEXT_PUBLIC_STOREFRONT_ID`: Hydrogen storefront ID for analytics.
- `NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`: Customer Account API client ID.

If `PRIVATE_STOREFRONT_API_TOKEN` is unset, the app uses `mock.shop`. If you set a private token, you must also set `NEXT_PUBLIC_STORE_DOMAIN`.

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm https:dev` | Start the Next.js dev server with trusted local HTTPS. |
| `pnpm build` | Build the production app. |
| `pnpm start` | Start the production server after `pnpm build`. |
| `pnpm lint` | Run ESLint. |
| `pnpm typecheck` | Run TypeScript and Hydrogen GraphQL checks. |

## Pages

- `/`: home with hero, featured products, and featured collections.
- `/collections`: all collections.
- `/collections/:handle`: collection page with filters, sort, pagination, and active filter chips.
- `/products/:handle`: product page with gallery, URL-synced variants, add to cart, Shop Pay, and related products.
- `/search`: storefront search with filters, sort, pagination, and predictive search.
- `/cart`: cart page and no-JS fallback for the cart drawer.
- `/account`: Customer Account OAuth page for real stores.
- `/sitemap.xml`: product and collection sitemap.
- `/robots.txt`: crawler rules for the storefront.

## Deploy to Vercel

The fastest path is one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShopify%2Fhydrogen%2Ftree%2Fdist-preview%2Ftemplates%2Fnextjs)

1. Click **Deploy with Vercel** above. Vercel clones this template into a new repository on your Git provider.
2. Keep the auto-detected Next.js settings.
3. Deploy. The app renders with `mock.shop` until you add store env vars.
4. Connect your store in **Project Settings -> Environment Variables**, then redeploy.

Prefer to wire it up yourself? Push this project to a Git provider, import it in Vercel, keep the detected Next.js settings, and deploy.

## Where to Start

- Pages live in `app/`.
- Shared UI lives in `components/`.
- Storefront, cart, Customer Account, analytics, and query helpers live in `lib/`.
- Global styling lives in `app/globals.css`.

## License

MIT. See [LICENSE](./LICENSE).
