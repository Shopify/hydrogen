---
'@shopify/hydrogen': minor
---

Return `null` synchronously from `handleShopifyRoutes()` when no Shopify route matches, allowing framework routing to continue without an unnecessary async hop. Matched routes continue to return a `Promise<Response>`.
