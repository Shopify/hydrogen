---
"@shopify/hydrogen": patch
---

The Storefront API client no longer follows redirects. Runtimes forward custom Shopify headers such as `Shopify-Storefront-Private-Token` across origins when they follow a redirect, so a `3xx` response from the Storefront API now throws a `StorefrontApiError` instead. Rejected redirects no longer contribute `Set-Cookie` headers to the response.

`createFetchWithCache()` now returns opaque responses, such as a browser `redirect: "manual"` response, unchanged instead of failing with a `RangeError` while serializing their `0` status.
