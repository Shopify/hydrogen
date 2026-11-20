---
"@shopify/hydrogen": minor
---

`StorefrontApiError` now exposes `retryAfter`, the raw `retry-after` header value from a Storefront API error response, mirroring `CustomerAccountApiError`. Read it on a `429` response to schedule a retry. The value is unvalidated: validate it before you send it as a header. `withStorefrontRateLimit` does this for React Router loaders. Responses without the header, redirect responses, and network failures leave `retryAfter` undefined.
