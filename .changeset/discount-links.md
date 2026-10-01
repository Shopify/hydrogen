---
"@shopify/hydrogen": minor
---

Apply Shopify discount links (`/discount/{code}`) from `handleShopifyRoutes`. The code is added to the shopper's cart, or a new cart is created with it, and the shopper is redirected with a 303 to the same-origin `redirect` or `return_to` path (default `/`). In-app navigation to a discount link through `Shopify.routes.navigate` becomes a document navigation so the handler can run.
