---
"@shopify/hydrogen": patch
---

The built-in cart queries now select `Cart.updatedAt`, so cart analytics deduplication works without a custom `CartFragment`.
