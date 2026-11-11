---
"@shopify/hydrogen": patch
---

`getCartId()` now reads the cart ID only from the `cart` cookie and no longer reads a `cartId` search parameter. To load a specific cart, pass its ID to `getCart()`.
