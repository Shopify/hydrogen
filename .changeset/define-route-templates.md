---
"@shopify/hydrogen": minor
---

Rename `createShopifyRouteTemplates` to `defineShopifyRouteTemplates`. Module-scope configuration definitions now use the `define*` prefix, while `create*` is reserved for factories that produce stateful objects or behavior (`createStorefrontClient`, `createShopifyRequestContext`, `createCartServerHandlers`). `createShopifyRouteTemplates` remains as a deprecated alias and will be removed in the next major release.
