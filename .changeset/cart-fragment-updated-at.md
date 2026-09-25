---
"@shopify/hydrogen": patch
---

The built-in cart queries now select `Cart.updatedAt`, so `trackCartAnalytics` deduplicates `cart_updated`, `product_added_to_cart`, and `product_removed_from_cart` without a custom `CartFragment`. If your custom `CartFragment` only selected `updatedAt`, you can remove it.
