---
"@shopify/hydrogen": minor
---

Keep one cart per seller with the UCP cart transport. Each seller's cart lives at `/api/cart?seller=<handle>`, where `<handle>` is the seller's myshopify handle, and in its own `HttpOnly` cookie named `hydrogen-cart.<handle>`. Pass `includeSellers: true` to the cart GET handler from your root loader to render every seller cart on the first page load. In React, read and change a seller's cart with `useCart(selector, { seller })`, `useCartForm({ seller })`, and `useCartActions({ seller })`, and read every cart with `useCarts`. Seller carts send one change at a time and never use Standard Actions or `shopify:cart:*` events. The Storefront API cart rejects `?seller=` changes with `seller_not_supported`.
