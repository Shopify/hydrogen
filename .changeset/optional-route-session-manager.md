---
"@shopify/hydrogen": patch
---

`handleShopifyRoutes` only requires `sessionManager` when a registered handler's context includes it, such as Customer Account handlers or cart handlers created with `customerSession`, so cart-only apps can omit it. Custom handlers from `createShopifyRouteHandler` can opt out by annotating their context, for example `Omit<ShopifyRouteHandlerContext, "sessionManager">`.
