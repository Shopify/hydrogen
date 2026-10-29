---
"@shopify/hydrogen": minor
---

Add `withStorefrontRateLimit` and `storefrontRateLimitHeaders`. Wrap a React Router loader or action with `withStorefrontRateLimit` to return HTTP `429` instead of `500` when the Storefront API rate limits the request. The `429` response has a fixed body, `Cache-Control: no-store`, and the Storefront API's `Retry-After` value when the value is valid. Other errors pass through unchanged. React Router doesn't report thrown responses to `handleError`, so the wrapper logs the original `StorefrontApiError` at `error` level through Hydrogen's logger. Export `storefrontRateLimitHeaders` as `headers` from the root route and from each wrapped route, so the headers reach page and data responses. Loaders that you don't wrap still return `500`.
