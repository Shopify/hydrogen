---
"@shopify/hydrogen": patch
---

Redirect `return_to` and `redirect` query params in `handleShopifyRedirects` to the normalized same-origin path instead of the raw value, so values like `https:other.example/p` or paths that normalize to `//other.example` no longer send shoppers to another host. Values without a leading `/` or a scheme are now ignored.
