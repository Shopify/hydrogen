---
'@shopify/hydrogen': patch
---

Fix the `OptimisticCart` type to properly retain the generic of line items. The `OptimisticCartLine` type now takes a cart or cart line item generic.
