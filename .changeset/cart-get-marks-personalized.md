---
"@shopify/hydrogen": patch
---

`cartHandlers.get()` now marks the request's response as personalized when the request has a cart ID, so `applyResponseHeaders()` makes a page or React Router `.data` response that renders the cart private and uncacheable. Before, a loader that kept only the handler's `data` threw away its private cache headers, and a shared cache could serve one buyer's cart ID and key to other visitors. The handler marks the response before it fetches the cart, so a loader that streams the cart promise is covered too. Requests without a `cart` cookie or `cartId` search parameter stay cacheable. A `cart` cookie for an expired or completed cart still makes the response private.
