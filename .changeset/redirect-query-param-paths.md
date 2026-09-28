---
"@shopify/hydrogen": patch
---

Only follow `return_to` and `redirect` query params in `handleShopifyRedirects` when they are same-origin paths such as `/dashboard`, and redirect to the normalized path. Absolute URLs, including same-origin ones, are now ignored.
