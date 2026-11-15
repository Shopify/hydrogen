# Nuxt example

> Development example for exercising Hydrogen APIs in Nuxt. This is not a starter template.
> See [`../README.md`](../README.md) for context.

Port of the canonical `examples/core` design to [Nuxt 3](https://nuxt.com/) with SSR on the Nitro Node server.

## What this demonstrates

- Nitro server middleware (`server/middleware/shopify.ts`) as the request entry point — it creates the request-scoped Storefront client and handles Hydrogen routes.
- `useFetch` in `pages/` as the data path — pages read from Nitro routes under `server/api/`.
- Tailwind v4 via `@tailwindcss/vite` — the design's `@theme` tokens live in `assets/css/main.css`.

## Storefront mode

`storefront/storefront-config.ts` selects the mode for each request from server environment variables:

- **Mock mode** uses `mock.shop`. The example uses it when `PRIVATE_STOREFRONT_API_TOKEN` is absent or empty, when `MOCK_SHOP=1`, or when `PUBLIC_STORE_DOMAIN` is `mock.shop` or a `*.mock.shop` subdomain (even if a token is set). A supported `mock.shop` subdomain in `PUBLIC_STORE_DOMAIN` stays selected in all of these cases.
- **Private mode** uses the shared store from `examples/shared/config.ts` with that store's private Storefront API token in `PRIVATE_STOREFRONT_API_TOKEN`. A `PUBLIC_STORE_DOMAIN` that is not a `mock.shop` domain is ignored, because the token, Customer Account, and Shopify script identity all belong to the shared store.

Customer Account is disabled in mock mode.

For development, authorized developers with the ejson key set up can run:

```sh
pnpm run examples:secrets:decrypt
```

This writes the shared store's private token to the Git-ignored `examples/nuxt/.env`, which `nuxt dev` loads.

## Customer Account setup

The account flow uses Customer Account values from `examples/shared/config.ts` and an encrypted HttpOnly `__Host-` cookie adapter from `examples/shared/customer-session.ts`. It is only available in private mode.

Customer Account OAuth requires a public HTTPS origin. To test locally without a tunnel, build the workspace packages first (`pnpm run build:pkgs`), then run:

```sh
pnpm --filter @shopify/hydrogen-example-nuxt dev:https
```

On the first run, you may need to restart the command after the Vite plugin provisions the certificate so Nuxt can load it.

The local HTTPS plugin can download mkcert, create and trust a local certificate authority, create certificates, link an unlinked Hydrogen storefront, and push the Customer Account callback, JavaScript origin, and logout URLs to that storefront. If automatic setup is unavailable, it prints the values for manual configuration.

## Run

```sh
# from the repo root
pnpm install
pnpm run dev:nuxt
```

`dev:nuxt` builds the workspace packages that the example depends on, then starts `nuxt dev`. Then open http://localhost:3000.

To build and serve the production output:

```sh
pnpm turbo run build --filter=@shopify/hydrogen-example-nuxt...
pnpm --filter @shopify/hydrogen-example-nuxt start
```

`pnpm start` runs the Nitro Node server (`node .output/server/index.mjs`) and listens on port 3000 by default (set `PORT` to change it). This server does not load `.env`. Set `PRIVATE_STOREFRONT_API_TOKEN` (and optionally `MOCK_SHOP` or `PUBLIC_STORE_DOMAIN`) in the server process environment, for example from your host's secret store. Without the token, the production server runs in mock mode.
