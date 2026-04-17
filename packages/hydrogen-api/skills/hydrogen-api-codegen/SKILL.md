---
name: hydrogen-api-codegen
description: >
  Guide for generating TypeScript types from the Shopify Storefront API
  and Customer Account API when using `@shopify/hydrogen-api`.
  Use when setting up `graphql-codegen` with the `@shopify/hydrogen-codegen`
  preset, resolving the bundled `.schema.json` files with `getSchema`,
  or wiring up `storefrontApiCustomScalars` /
  `customerAccountApiCustomScalars`.
---

# Codegen with `@shopify/hydrogen-api`

`@shopify/hydrogen-api` ships everything needed to type-check GraphQL operations against the Storefront API and Customer Account API without pulling in the Hydrogen framework. Use it together with `@shopify/hydrogen-codegen`, which is a `graphql-codegen` preset that wires the two packages together.

For installation and client setup, see `hydrogen-api-setup`. For a full export lookup, see `hydrogen-api-reference`.

## What ships with the package

- `@shopify/hydrogen-api/storefront.schema.json` — SDL introspection of the Storefront API.
- `@shopify/hydrogen-api/customer-account.schema.json` — SDL introspection of the Customer Account API.
- `@shopify/hydrogen-api/storefront-api-types` — generated TypeScript types for Storefront.
- `@shopify/hydrogen-api/customer-account-api-types` — generated TypeScript types for Customer Account.
- `getSchema(api)` — a helper that returns the absolute filesystem path to one of the bundled `.schema.json` files.

## Recommended setup

Install the two packages and wire them together in `codegen.ts`:

```sh
npm add -D @shopify/hydrogen-codegen @graphql-codegen/cli
```

```ts
// codegen.ts
import {CodegenConfig} from '@graphql-codegen/cli';
import {preset, pluckConfig} from '@shopify/hydrogen-codegen';
import {
  getSchema,
  storefrontApiCustomScalars,
} from '@shopify/hydrogen-api';

const config: CodegenConfig = {
  overwrite: true,
  pluckConfig,
  generates: {
    'app/generated/storefront.ts': {
      preset,
      schema: getSchema('storefront'),
      documents: ['app/**/*.{ts,tsx}'],
      config: {scalars: storefrontApiCustomScalars},
    },
  },
};

export default config;
```

The preset emits a `.d.ts` that augments `StorefrontQueries` / `StorefrontMutations` for every `#graphql`-tagged string in `documents`. No manual `declare module` blocks, no extra plugins. Once that file is in your build, `storefront.query` and `storefront.mutate` return typed results with no generic annotation:

```ts
const {products} = await storefront.query(PRODUCTS_QUERY);
//       ^? typed as ProductsQuery['products']
```

## Writing queries the codegen can see

Every operation must be a template literal whose first line is a `#graphql` comment. The preset's `pluckConfig` scans `documents` for that prefix — anything without it is invisible:

```ts
// ✅ Picked up
const PRODUCTS_QUERY = `#graphql
  query Products {
    products(first: 10) { nodes { id title } }
  }
`;

// ❌ Not picked up — no #graphql prefix
const RAW = `query Products { ... }`;
```

`#graphql` is valid GraphQL (the language ignores `#` comments) and doubles as a hint for the VSCode GraphQL extension, which highlights and validates strings that start with it. Prefer hoisting operations to top-level `const`s in files covered by `documents` — that keeps the generated type names stable and makes the query reusable.

## Generating types

Add a script to `package.json` and run it whenever you add or change an operation:

```json
{
  "scripts": {
    "graphql-types": "graphql-codegen --config codegen.ts"
  }
}
```

Run `pnpm run graphql-types`:

- After adding a new `#graphql`-tagged query or mutation.
- After editing an existing one (selection set, variables, fragments).
- After bumping `@shopify/hydrogen-api` to a version that targets a newer API.
- In CI — fail the build if the generated file is out of date (`graphql-codegen --check` or a `git diff --exit-code` guard).

Check the generated `.d.ts` into git so PR reviewers see the type diff alongside the query change. A `predev` / `prebuild` hook that runs the script keeps stale types from slipping through locally.

## Resolving the bundled schema with `getSchema`

`getSchema(api)` returns an absolute filesystem path to the bundled `.schema.json` for `'storefront'` or `'customer-account'`. Use it directly as the `schema:` value in a `graphql-codegen` config.

It is Node-only (uses `node:fs` and `node:url`) and resolves symmetrically against the source tree and the built package, so the same import works in a workspace and in a published install.

Pass `{throwIfMissing: false}` to get `undefined` instead of an error when the file is absent:

```ts
const schema = getSchema('storefront', {throwIfMissing: false});
```

## Custom scalars

The Storefront API and Customer Account API expose custom scalars (`DateTime`, `Decimal`, `HTML`, `URL`, `UnsignedInt64`, `Color`, `ISO8601DateTime`). `graphql-codegen` types them as `any` by default.

Pass the record exported from `@shopify/hydrogen-api` to map them to `string`:

```ts
import {
  storefrontApiCustomScalars,
  customerAccountApiCustomScalars,
} from '@shopify/hydrogen-api';
```

## Keeping versions aligned

`@shopify/hydrogen-api` is built against a specific API version and pins to it internally — the client does not accept a version override, and internal queries (cart, customer, etc.) are generated against that version. `SFAPI_VERSION` and `CAAPI_VERSION` are exported from `@shopify/hydrogen-api` if you need to read the literal version string at runtime (for logging, headers, or your own codegen config). Upgrading the package is the supported way to move to a newer API version.

## Interop with `@shopify/hydrogen-codegen`

`@shopify/hydrogen-codegen` has its own `getSchema` with the same signature. It resolves the schema to the `@shopify/hydrogen` library instead. Prefer `getSchema` from `@shopify/hydrogen-api` so the codegen config has the correct dependency source.
