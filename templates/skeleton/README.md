# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 16.14.0 or higher

```bash
npm create @shopify/hydrogen@latest
```

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```

## Setup for using Customer Account API (`/account` section)

### Enabled new Customer Account Experience

1. Go to your Shopify admin => Settings => Customer accounts => New customer account

### Setup public domain using ngrok

1. Setup a [ngrok](https://ngrok.com/) account and add a permanent domain (ie. `https://<your-ngrok-domain>.app`).
1. Install the [ngrok CLI](https://ngrok.com/download) to use in terminal
1. Start ngrok using `ngrok http --domain=<your-ngrok-domain>.app 3000`

> [!IMPORTANT]
> To successfully interact with the Customer Account API routes you will need to use the ngrok domain during development instead of localhost
### Include public domain in Customer Account API settings

1. Go to your Shopify admin => `Hydrogen` or `Headless` app/channel => Customer Account API => Application setup
1. Edit `Callback URI(s)` to include `https://<your-ngrok-domain>.app/account/authorize`
1. Edit `Javascript origin(s)` to include your public domain `https://<your-ngrok-domain>.app` or keep it blank
1. Edit `Logout URI` to include your public domain `https://<your-ngrok-domain>.app` or keep it blank

### Add the ngrok domain to the CSP policy

Modify your `/app/entry.server.tsx` to allow the ngrok domain as a connect-src

```diff
-  const {nonce, header, NonceProvider} = createContentSecurityPolicy()
+  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
+   connectSrc: [
+     'wss://<your-ngrok-domain>.app:*', // Your ngrok websocket domain
+   ],
+ });
```

### Prepare Environment variables

Run [`npx shopify hydrogen link`](https://shopify.dev/docs/custom-storefronts/hydrogen/cli#link) or [`npx shopify hydrogen env pull`](https://shopify.dev/docs/custom-storefronts/hydrogen/cli#env-pull) to link this app to your own test shop.

Alternately, the values of the required environment variables "PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID" and "PUBLIC_CUSTOMER_ACCOUNT_API_URL" can be found in customer account api settings in the Hydrogen admin channel.

> [!IMPORTANT]
> Note that `mock.shop` doesn't supply these variables automatically and your own test shop is required for using Customer Account API

> [!NOTE]
> B2B features such as contextual pricing is not available in SF API with Customer Account API login. If you require this feature, we suggest using the [legacy-customer-account-flow](https://github.com/Shopify/hydrogen/tree/main/examples/legacy-customer-account-flow). This feature should be available in the Customer Account API in the 2024-04 release.
