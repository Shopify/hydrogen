---
'@shopify/hydrogen': patch
---

Reject Storefront API redirects instead of forwarding API tokens and buyer headers to redirected destinations. Redirect responses now follow the existing `StorefrontApiError` handling. Configure `storeDomain` to reach the Storefront API endpoint directly.
