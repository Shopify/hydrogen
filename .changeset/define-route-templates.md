---
"@shopify/hydrogen": minor
---

Rename `createShopifyRouteTemplates` to `defineShopifyRouteTemplates`. Module-scope configuration definitions now use the `define*` prefix, while `create*` is reserved for factories that produce stateful objects or behavior (`createStorefrontClient`, `createShopifyRequestContext`, `createCartServerHandlers`). No alias is kept: update imports and calls in place.
