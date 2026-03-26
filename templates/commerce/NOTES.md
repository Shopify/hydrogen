# Migration Notes: Next.js Commerce → `@shopify/hydrogen-temp`

This document records how the commerce template was migrated from a hand-rolled `shopifyFetch` wrapper to the `@shopify/hydrogen-temp` Storefront API client. Use it as a guide for migrating other Next.js apps.

## What Changed

### Before

The template had a hand-rolled `shopifyFetch` function that:
- Manually constructed the Storefront API URL from env vars
- Set `Content-Type` and `X-Shopify-Storefront-Access-Token` headers
- Called `fetch()` directly with no timeout
- Returned `{ status, body }` where `body` contained the raw GraphQL response
- Had custom error handling via `isShopifyError` type guard
- Hardcoded API version `2023-01`

### After

The template uses `createStorefrontClient` from `@shopify/hydrogen-temp`:
- URL construction, headers, and token management are handled by the client
- All fetch calls have built-in timeouts (10s for queries, 30s for forwarding)
- `storefront.query()` returns the `data` object directly (no `body.data` wrapper)
- `storefront.mutate()` for mutations (never cached by the client)
- Error handling via `GraphQLError` class (propagates to Next.js error boundaries)
- API version defaults to `2026-01`

## Client Configuration

```ts
import { createStorefrontClient } from "@shopify/hydrogen-temp";

const { storefront } = createStorefrontClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  publicStorefrontToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
});
```

The client is created as a **module-level singleton**. This matches the previous `shopifyFetch` pattern and works because:
- Next.js RSC doesn't pass a per-request object through the component tree
- The template doesn't forward buyer IP or cookies to the Storefront API
- No `cache` instance is passed — Next.js owns caching (see below)
- No `i18n` config — the template has no internationalization

## Caching Strategy

**Next.js owns caching entirely.** The hydrogen-temp client has its own cache layer (Web Cache API + stale-while-revalidate), but we disable it by not passing a `cache` instance. Instead:

- `"use cache"` / `"use cache: private"` directives control caching at the function level
- `cacheTag()` sets cache tags for targeted revalidation
- `cacheLife()` sets cache duration ("seconds", "days")
- `revalidateTag()` is called from the webhook endpoint to invalidate cached data

This avoids double-caching and keeps the caching strategy within Next.js's control.

## How to Type Queries Without Codegen

The `storefront.query()` method accepts an `OverrideReturnType` generic that types the return value:

```ts
// The existing operation types define both `data` and `variables`:
type ShopifyProductOperation = {
  data: { product: ShopifyProduct };
  variables: { handle: string };
};

// Index into the `data` property to type what query() returns:
const data = await storefront.query<ShopifyProductOperation["data"]>(
  getProductQuery,
  { variables: { handle } },
);

// `data` is typed as { product: ShopifyProduct }
return data.product;
```

For mutations, use `storefront.mutate<T>()` with the same pattern.

## Files Removed

| File | Reason |
|------|--------|
| `lib/type-guards.ts` | `isShopifyError` only used by `shopifyFetch` — the client handles errors internally |
| `SHOPIFY_GRAPHQL_API_ENDPOINT` in `lib/constants.ts` | The client constructs URLs from `storeDomain` |
| `ensureStartsWith` in `lib/utils.ts` | The client handles `https://` prefixing via `getShopifyDomain()` |

## API Version Upgrade

The API version changed from `2023-01` to `2026-01`. The `@shopify/hydrogen-temp` client defaults to the latest supported version. If you need to pin a specific version:

```ts
const { storefront } = createStorefrontClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  publicStorefrontToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
  storefrontApiVersion: "2026-01", // pin to specific version
});
```

## GraphQL Codegen

The commerce template uses `.graphqlrc.ts` (the `graphql-config` standard) with `@graphql-codegen/cli`.

Run with: `pnpm codegen`

### How it differs from skeleton

| Aspect | Skeleton | Commerce |
|---|---|---|
| CLI runner | `shopify hydrogen codegen` (Hydrogen CLI) | `graphql-codegen` (`@graphql-codegen/cli` directly) |
| Config complexity | Minimal — only `schema` + `documents`; CLI injects preset | Full — must specify `preset`, `pluckConfig`, `overwrite`, output path in `extensions.codegen` |
| Codegen package | `@shopify/hydrogen-codegen` | `@shopify/hydrogen-temp/codegen` |
| Customer Account API | Active `customer` project | Commented-out placeholder (hydrogen-temp doesn't support it yet) |

### Why not use the Hydrogen CLI?

The CLI's fallback codegen path hardcodes `@shopify/hydrogen-codegen`'s preset, which generates `declare module '@shopify/hydrogen'`. Since this template uses `@shopify/hydrogen-temp`, the module augmentation wouldn't match.

### Post-rename simplification opportunity

Once `hydrogen-temp` is renamed to `@shopify/hydrogen`, the mismatch disappears. At that point, commerce could:
1. Switch to `shopify hydrogen codegen` like skeleton
2. Simplify `.graphqlrc.ts` to skeleton's minimal style (just `schema` + `documents`, drop the `extensions.codegen` block)

This is optional — the current explicit `graphql-codegen` approach will also work after rename with just a package name change in `.graphqlrc.ts`.
