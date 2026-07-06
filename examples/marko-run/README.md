# Hydrogen Marko Run example

A proof-of-concept Hydrogen storefront built with Marko 6 and `@marko/run`.

## Running

From the repo root:

```sh
pnpm --filter @shopify/hydrogen-example-marko-run dev
```

The example uses `@marko/run` route files under `src/routes`, root middleware for Hydrogen request context and cart routes, and route-local `+handler.ts` files to fetch Storefront API data before rendering Marko pages.
