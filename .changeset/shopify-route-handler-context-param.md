---
"@shopify/hydrogen": minor
---

`ShopifyRouteHandler` accepts an optional third type parameter for the handler's context, defaulting to `ShopifyRouteHandlerContext`, and `createShopifyRouteHandler` now returns `ShopifyRouteHandler<TPathname, TMethod, TContext>`. Use it to type a handler whose context omits `sessionManager`, for example `ShopifyRouteHandler<"/api/cart", "POST", Omit<ShopifyRouteHandlerContext, "sessionManager">>`. Existing uses are unchanged.
