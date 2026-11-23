---
"@shopify/hydrogen": minor
---

Apply Shopify discount links (`/discount/{code}`) from `handleShopifyRoutes` when the cart handlers from `createCartServerHandlers()` are registered. The code is added to the shopper's cart, or a new cart is created with it and attached to the logged-in customer when the cart handlers have a `customerSession`. The shopper is then redirected with a 303 to the same-origin `redirect` or `return_to` path (default `/`), keeping the link's other query params such as `utm_*`. Links under a locale path prefix, such as `/fr-ca/discount/{code}`, apply the code in that locale, and a target without a locale stays in it. `HEAD` requests get the redirect without changing the cart. In-app navigation to a discount link through `Shopify.routes.navigate` becomes a document navigation so the handler can run.

Hydrogen now handles `/discount/{code}` before framework routing, as the Online Store does. If your app has its own `/discount/$code` route, such as the one the previous skeleton template shipped, you can delete it. Like `/checkout` and cart permalinks, in-app links to a discount link then need a full page load, such as React Router's `reloadDocument`.
