# Next.js Hydrogen Example

> **This is a development example, not a starter.** It exists to exercise `@shopify/hydrogen` in Next.js and to run the storefront E2E suite in this repository. For a Next.js starter, use [Vercel Shop](https://github.com/vercel/shop), which Vercel builds and maintains on Hydrogen:
>
> [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fshop&project-name=shop&repository-name=shop&demo-title=Vercel+Shop&demo-url=https%3A%2F%2Fshop-template.vercel.app&env=NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN%2CNEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN%2CNEXT_PUBLIC_SHOPIFY_SHOP_ID&envDescription=Required%20Shopify%20store%20domain%2C%20Storefront%20API%20token%2C%20and%20shop%20ID&envLink=https%3A%2F%2Fvercel.shop%2Fdocs%2Freference%2Fenv-vars)
>
> ```sh
> pnpm create next-app@latest my-store --example https://github.com/vercel/shop
> ```

A Next.js 16 App Router storefront built on [`@shopify/hydrogen`](https://www.npmjs.com/package/@shopify/hydrogen).

It includes home, collections, product pages, search, cart, customer accounts, sitemap, robots, Shopify analytics, and a consent banner. With no private token it falls back to `mock.shop` so the app can render before you connect a store.

## Requirements

- Node.js 24+
- pnpm

## Run Locally

From the repository root:

```sh
pnpm install
pnpm dev:next
```

Open <http://localhost:3000>.

Customer Accounts require an HTTPS origin because Shopify OAuth rejects `http`. Run the HTTPS development server and open <https://local.tryhydrogen.dev:5173>:

```sh
pnpm --filter @shopify/hydrogen-example-nextjs dev:https
```

Next.js provisions and reuses a trusted development certificate under `certificates/`. On first run, it may prompt to install the local certificate authority.

Next.js does not use Hydrogen's Vite plugin, so configure the Customer Account callback, JavaScript origin, and logout URLs manually. The `hydrogen-local-https` skill lists the exact values.

## Environment Variables

Copy `.env.example` to `.env` when you are ready to connect a real store:

```sh
cp examples/nextjs/.env.example examples/nextjs/.env
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

`mock.shop` is a catalog of fictional stores, each on its own host. The default at `mock.shop` sells apparel basics; the directory at [mock.shop/llms.txt](https://mock.shop/llms.txt) lists every other store with what it sells. Set `NEXT_PUBLIC_STORE_DOMAIN` to one of those hosts (for example `pets.mock.shop`) to build against that store's catalog while staying in mock mode.

## Scripts

Run these from `examples/nextjs`, or from the repository root with `pnpm --filter @shopify/hydrogen-example-nextjs <script>`.

| Script | Does |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm dev:https` | Start the Next.js dev server with trusted local HTTPS. |
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
- `/cart`: cart page with Shop Pay and no-JS fallback for the cart drawer.
- `/account`: Customer Account OAuth page for real stores.
- `/sitemap.xml`: product and collection sitemap.
- `/robots.txt`: crawler rules for the storefront.

## Where to Start

- Pages live in `app/`.
- Shared UI lives in `components/`.
- Storefront, cart, Customer Account, analytics, and query helpers live in `lib/`.
- Global styling lives in `app/globals.css`.

## License

MIT. See the repository [LICENSE](../../LICENSE.md).
