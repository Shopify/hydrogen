# Sub-Request Caching

`Cache`, `createRunWithCache`, `createFetchWithCache`, and `CachingStrategy` are public exports of `@shopify/hydrogen` — the sub-request cache for catalog reads (products, collections, pages) on Oxygen-style runtimes that expose a `cache` store and `waitUntil`. Strategies are `Cache.long()`, `Cache.short()`, and `Cache.none()`. Pass `cache` (+ optional `waitUntil`) to `createStorefrontClient` and it builds `fetchWithCache` for you; reach for `createFetchWithCache` directly only when injecting a custom cached `fetch`.

## Cache catalog reads through the client

Pass `cache` (and optional `waitUntil`) to `createStorefrontClient` and opt in per query with `cache`. The client builds the cache key and skips caching GraphQL errors for you:

```ts
import { Cache, createStorefrontClient } from "@shopify/hydrogen";

const client = createStorefrontClient({
  type: "public",
  requestContext,
  config: { storeDomain, publicStorefrontToken, cache, waitUntil },
});

const { data, errors } = await client.graphql(PRODUCTS, { variables, cache: Cache.long() });
```

**Caching only engages when you pass `cache` per query.** Configuring `cache` on the client alone caches nothing — queries without a `cache` strategy (and all mutations) are never cached.

## Never cache private data

Do not pass a `cache` strategy to personalized reads (cart, customer); keep them on a request-scoped client. Cache mode `private` is unsupported — for buyer-specific caching use `createRunWithCache` with an explicit private key.
