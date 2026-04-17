---
name: hydrogen-api-reference
description: >
  Reference lookup of every value and type exported from
  `@shopify/hydrogen-api`, grouped by purpose.
  Use when checking what a function returns, what options a client
  accepts, what cache strategies are available, or whether a given name
  is exported.
---

# `@shopify/hydrogen-api` reference

Complete export surface. For installation and client setup, see `hydrogen-api-setup`. For codegen setup, see `hydrogen-api-codegen`.

## Clients

- `createStorefrontClient(options)` — server client with caching, subrequest headers, i18n, GraphQL validation, error formatting, and request forwarding. Returns `{storefront, ...}`.
- `createStorefrontUtilities(options)` — low-level URL and header builder. Returns `{getPublicTokenHeaders, getPrivateTokenHeaders, getStorefrontApiUrl, getShopifyDomain}`.

## Typed query / mutation maps

Augmentable interfaces populated by `graphql-codegen`:

- `StorefrontQueries` — maps query strings to `{return, variables}`.
- `StorefrontMutations` — maps mutation strings to `{return, variables}`.

## Cache strategies

Pre-defined strategies (call them as functions to customize):

- `CacheNone()` — no caching.
- `CacheShort(overrides?)` — short-lived cache with `stale-while-revalidate`.
- `CacheLong(overrides?)` — long-lived cache.
- `CacheDefault(overrides?)` — a middle-ground default.
- `CacheCustom(options)` — full control; pass `AllCacheOptions`.
- `generateCacheControlHeader(strategy)` — serializes a strategy to a `Cache-Control` header string.

Cache option types:

- `AllCacheOptions` — `{mode?, maxAge?, staleWhileRevalidate?, sMaxAge?, staleIfError?}`.
- `CachingStrategy` — alias for `AllCacheOptions`.
- `NoStoreStrategy` — the shape returned by `CacheNone()`.

## Cache internals

For building your own cache-aware subrequests:

- `runWithCache(cacheKey, actionFn, options)` — core cache-with-SWR runner. Accepts a `CacheKey`, an action returning the fresh value, and a `CachingStrategy` / debug options.
- `fetchWithServerCache(url, requestInit, options)` — `fetch` wrapper that goes through `runWithCache`.
- `hashKey(parts)` — URL-encoded serialization of a `CacheKey` array. Matches what `runWithCache` uses internally.

Related types:

- `CacheKey` — array of primitive parts.
- `CacheActionFunctionParam` — argument shape passed to your action callback.
- `DebugOptions` — diagnostic hooks for `runWithCache`.
- `FetchCacheOptions` — options for `fetchWithServerCache`.

## Request / header helpers

- `getStorefrontHeaders(request)` — extracts buyer IP, request-id, cookie, and purpose from an Oxygen request into a `StorefrontHeaders` object.

Related types:

- `StorefrontHeaders` — `{requestGroupId, buyerIp, buyerIpSig, cookie, purpose}`.
- `CrossRuntimeRequest` — minimal request shape used by the helpers.
- `WaitUntil` — `(promise: Promise<unknown>) => void`.

## GraphQL errors

- `GraphQLError` — error class thrown by the client. Includes `response`, `query`, `queryVariables`, `errors`, `clientOperation`.

Related types:

- `GraphQLApiResponse<T>` — `{data?: T, errors?}`.
- `GraphQLErrorOptions` — constructor options for `GraphQLError`.

## Codegen helpers

- `storefrontApiCustomScalars` — record mapping custom scalars to `'string'` for `graphql-codegen`.
- `customerAccountApiCustomScalars` — same, for Customer Account API scalars.
- `getSchema(api, options?)` — absolute filesystem path to the bundled `.schema.json` for `'storefront'` or `'customer-account'`. Pass `{throwIfMissing: false}` to return `undefined` instead of throwing.
- `SchemaApi` — `'storefront' | 'customer-account'`.

## Constants

- `SFAPI_VERSION` — the Storefront API version this build targets. Read-only; the client pins to this internally.
- `CAAPI_VERSION` — the Customer Account API version this build targets.

## Subpath exports

For consumers that want the types or raw SDL without touching the JS entry:

- `@shopify/hydrogen-api/storefront-api-types` — generated Storefront types.
- `@shopify/hydrogen-api/customer-account-api-types` — generated Customer Account types.
- `@shopify/hydrogen-api/storefront.schema.json` — SDL introspection of the Storefront API.
- `@shopify/hydrogen-api/customer-account.schema.json` — SDL introspection of the Customer Account API.
- `@shopify/hydrogen-api/schema` — the `getSchema` helper, importable without loading the client tree.
