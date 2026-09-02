---
'@shopify/hydrogen': patch
---

Finalize responses returned by `handleShopifyRoutes` and `handleShopifyRedirects` with the storefront headers required by Hydrogen, including the `powered-by` response identity. Framework integrations can now return these responses directly without applying storefront headers again.
