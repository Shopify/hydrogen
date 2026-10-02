---
"@shopify/hydrogen": patch
---

`handleShopifyRoutes` now hands `/checkout` and cart permalinks (`/cart/{variantId}:{quantity}`) to Shopify only when they match those routes. Before, every Hydrogen handoff path that reached the checkout handler was treated as a cart permalink, so `/account/login` and the other Customer Account paths were sent to the Online Store with a `payment=shop_pay` param when the Customer Account handlers were not registered. Those paths now fall through to the app.
