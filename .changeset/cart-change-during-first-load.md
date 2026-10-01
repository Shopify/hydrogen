---
"@shopify/hydrogen": patch
---

A cart change made while a cart load is still in flight no longer hides the shopper's other lines or leaves `loading` stuck on `true`. The store revalidates the cart once the change settles, including when the store is destroyed and reconnected before then.
