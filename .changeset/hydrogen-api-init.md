---
'@shopify/hydrogen-api': patch
---

Add `@shopify/hydrogen-api` — a framework-agnostic package that exports the full server-side Storefront API client with caching, i18n, GraphQL validation, error handling, and `@defer` streaming support. Includes generated Storefront and Customer Account API types, introspection schemas, and cache strategies. This package can be used without React or any framework.

### Divergences from `@shopify/hydrogen`

- **Private tokens in a browser context throw instead of warning.** `createStorefrontClient` refuses to construct when `privateStorefrontToken` is set in a runtime where `globalThis.document` is defined — in both development and production. The equivalent guard in `@shopify/hydrogen` is a dev-only `warnOnce`, which is dead-code-eliminated from its production bundle. A private token that reaches a client bundle is unrecoverable: anyone who views the bundle can reuse it to query the store as an authenticated caller. The hard throw surfaces the mistake before a release instead of after a leak.
- **No `storefrontApiVersion` override on `query`, `mutate`, or `forward`.** The option is removed from `StorefrontCommonExtraParams`, and `forward(request)` no longer parses a version from the request URL — every call uses the version this build of `@shopify/hydrogen-api` targets. In `@shopify/hydrogen`, callers could override the version per request. Internal queries (cart, customer, etc.) are typed against the build-target version, so a per-call override silently produces responses that don't match the typed shape. To move to a newer version, upgrade the package.
