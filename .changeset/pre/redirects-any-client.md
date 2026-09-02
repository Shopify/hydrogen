---
'@shopify/hydrogen': patch
---

`handleShopifyRedirects` now accepts any Storefront client instead of requiring a private one. The redirect lookup only queries `urlRedirects`, which needs no token, so public — including tokenless — clients work. A token-backed client is still recommended for real stores.
