# React Router Hydrogen template

<a href="https://admin.shopify.com/hydrogen/new?template=react-router"><img alt="Deploy to Oxygen" src="https://raw.githubusercontent.com/Shopify/hydrogen/preview/.github/images/deploy-to-oxygen.svg" width="182" height="46"></a>

A React Router 7 storefront built on Hydrogen 3 and optimized for Oxygen deployments. The deploy button and `dist-preview` branch provide standalone copies of the template.

## What's Included

- `/` — home with featured products and collections.
- `/collections` and `/collections/:handle` — collections, filters, sort, and pagination.
- `/products/:handle` — product details, variant selection, add to cart, Shop Pay, and related products.
- `/search` — search with predictive search, filters, sort, and pagination.
- `/cart` — server-rendered cart page and no-JS fallback for the cart drawer.
- `/account` — optional Customer Accounts profile/login surface for real stores.
- `/sitemap.xml` and `/robots.txt` — SEO resource routes.

## Run Locally

In a standalone checkout generated from `dist-preview`:

```bash
npm install
npm run dev
```

Inside the Hydrogen monorepo, run `pnpm install` from the repository root, then start this workspace with `pnpm --filter @shopify/hydrogen-template-react-router dev`.

With no `PRIVATE_STOREFRONT_API_TOKEN`, the template uses mock.shop and runs without configuration.

## Use A Real Store

```bash
cp .env.example .env
```

Set these values in `.env`:

```bash
PUBLIC_STORE_DOMAIN=<your-shop>.myshopify.com
PRIVATE_STOREFRONT_API_TOKEN=<your-private-storefront-api-token>
```

Oxygen injects those bindings automatically for linked storefronts. `MOCK_SHOP=1` forces the mock.shop demo.

## Deploy to Oxygen

<a href="https://admin.shopify.com/hydrogen/new?template=react-router"><img alt="Deploy to Oxygen" src="https://raw.githubusercontent.com/Shopify/hydrogen/preview/.github/images/deploy-to-oxygen.svg" width="182" height="46"></a>

The fastest way to deploy is the button above. It creates a new Oxygen project from this template and links it to your Shopify store.

For manual deploys, run:

```bash
npm run deploy
```

A linked Oxygen storefront injects `PUBLIC_STORE_DOMAIN` and `PRIVATE_STOREFRONT_API_TOKEN` automatically.

## Customer Accounts

Customer Accounts are part of the template. They stay disabled until the template is using a real store and all account values are present:

```bash
PUBLIC_STORE_DOMAIN=<your-shop>.myshopify.com
PRIVATE_STOREFRONT_API_TOKEN=<your-private-storefront-api-token>
SHOP_ID=<numeric-shop-id>
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=<customer-account-api-client-id>
CUSTOMER_ACCOUNT_SESSION_SECRET=<32-plus-character-secret>
```

Local Customer Account OAuth requires an HTTPS origin configured in Shopify admin. This template's default `npm run dev` server is HTTP, so use an Oxygen deployment for account testing or run the app behind your own trusted HTTPS tunnel/origin.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with Mini Oxygen. |
| `npm run build` | Build the React Router app for Oxygen. |
| `npm run preview` | Build and preview locally with Mini Oxygen. |
| `npm run deploy` | Deploy to Oxygen with Shopify CLI. |
| `npm run typecheck` | Generate React Router types, run TypeScript, and validate GraphQL. |

## Environment

- `MOCK_SHOP` — set to `1` to force mock.shop.
- `PUBLIC_STORE_DOMAIN` — real store domain.
- `PRIVATE_STOREFRONT_API_TOKEN` — private Storefront API token.
- `PUBLIC_SITE_ORIGIN` — canonical origin for sitemap, robots, and meta tags.
- `SHOP_ID` — numeric Shopify shop ID for Customer Accounts.
- `PUBLIC_STOREFRONT_ID` — storefront ID for Shopify scripts.
- `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` — Customer Account API client ID.
- `CUSTOMER_ACCOUNT_SESSION_SECRET` — private cookie encryption secret.

## Where To Start

- Routes live in `app/routes`.
- Shared UI lives in `app/components`.
- Storefront, cart, account, and runtime helpers live in `app/lib`.
- Styling lives in `app/app.css` and uses Tailwind CSS 4.

## License

MIT — see [LICENSE](./LICENSE).
