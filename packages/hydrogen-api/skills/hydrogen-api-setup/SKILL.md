---
name: hydrogen-api-setup
description: >
  First-time setup for `@shopify/hydrogen-api` — install the package,
  create a Storefront client, and run a first query. Use when adding
  the package to a project for the first time, when onboarding
  someone who hasn't used it, or when setting it up outside the
  Hydrogen framework (Vite, esbuild, Rollup, workers, etc.).
---

# Setting up `@shopify/hydrogen-api`

A framework-agnostic Storefront API client. Works in any JS runtime that provides `fetch` and `Request`/`Response` — no React, Remix, or React Router required.

Follow the steps in order. The skill sticks to what's required to go from empty project to a working query; for type-safety, see `hydrogen-api-codegen`. For an export lookup, see `hydrogen-api-reference`.

## 1. Install

```sh
npm add @shopify/hydrogen-api
```

The package is ESM-only (`"type": "module"`). No build-time flags, globals, or bundler `define` entries are needed — the shipped `dist/` is self-contained.

## 2. Create a client

```ts
import {createStorefrontClient} from '@shopify/hydrogen-api';

const {storefront} = createStorefrontClient({
  publicStorefrontToken: process.env.PUBLIC_STOREFRONT_TOKEN,
  storeDomain: 'your-shop.myshopify.com',
});
```

During development you can omit both `storeDomain` and the token — the client defaults to `mock.shop`, which accepts tokenless requests and returns realistic fixtures.

**Which factory?** `createStorefrontClient` is the full server client (caching, subrequest headers, i18n, request forwarding). For edge/browser runtimes or when you want to own the fetch, use `createStorefrontUtilities` — URL and header builders only.

**Which token?** A **private** token (delegate access, server-only — never ship to a browser) goes on `privateStorefrontToken`. A **public** storefront token (browser-safe) goes on `publicStorefrontToken`. If both are set, the private one wins.

## 3. Run a query

```ts
const {shop} = await storefront.query(`#graphql
  query Shop { shop { name } }
`);
```

The `#graphql` prefix is part of the contract — `@shopify/hydrogen-codegen`'s `pluckConfig` only sees template literals that start with it. Queries without the prefix work at runtime but stay untyped and invisible to codegen.

## 4. Add type-safety

By default `storefront.query` and `storefront.mutate` return `any`. To get typed results, wire up `graphql-codegen` with `@shopify/hydrogen-codegen`'s preset — see `hydrogen-api-codegen`.

## Pinned API version

The Storefront API version is pinned to what this build of `@shopify/hydrogen-api` targets — there is no `storefrontApiVersion` option on any of the client factories. Internal queries (cart, customer, etc.) are generated against that version, so a caller override would silently produce responses that don't match the typed shape. Upgrade the package to move to a newer version. `SFAPI_VERSION` and `CAAPI_VERSION` are exported if you need the literal string at runtime (for logging or for a `codegen.ts` config).
