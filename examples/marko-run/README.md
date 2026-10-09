# Hydrogen Marko Run example

A proof-of-concept Hydrogen storefront built with Marko 6 and `@marko/run`.

## Running

With no `PRIVATE_STOREFRONT_API_TOKEN`, the example uses the tokenless `mock.shop` demo.

To send Storefront API requests to your own test store, set both values in `examples/marko-run/.env`:

```dotenv
PUBLIC_STORE_DOMAIN=markorun.myshopify.com
PRIVATE_STOREFRONT_API_TOKEN=your-private-storefront-token-for-that-store
```

With a private token and no `PUBLIC_STORE_DOMAIN`, the example uses the store in `examples/shared/config.ts`. You can provision that store's token with `pnpm run examples:secrets:decrypt` if you have the EJSON key. Shopify script metadata still comes from the shared config.

To use the demo even when a private token is set, set `PUBLIC_STORE_DOMAIN=mock.shop`. Other `*.mock.shop` domains select their demo catalogs. Private tokens are never sent to mock stores. Restart the dev server after changing `.env`.

Start the example from the repo root:

```sh
pnpm dev:marko
```

`pnpm dev:marko` builds the workspace Hydrogen package before starting Marko. Both Marko dev scripts load `examples/marko-run/.env` with `--env .env`. When running the example directly with `pnpm --filter @shopify/hydrogen-example-marko-run dev` or `dev:https`, build Hydrogen first with `pnpm build:pkgs`. Restart after changing Hydrogen package source; `pnpm dev:marko` does not watch the package.

> [!WARNING]
> Local HTTPS support is in progress. Marko Run's default adapter serves the dev app with Node's `http` server and runs Vite with `middlewareMode: true`, which ignores the `server.https` config set by the HTTPS plugin. This will work once Marko Run supports HTTPS without a custom adapter.

To try local HTTPS, run:

```sh
pnpm --filter @shopify/hydrogen-example-marko-run dev:https
```

The example uses `@marko/run` route files under `src/routes`, root middleware for Hydrogen request context and cart routes, and route-local `+handler.ts` files to fetch Storefront API data before rendering Marko pages.
