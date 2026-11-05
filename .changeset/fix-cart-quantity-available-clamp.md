---
"@shopify/hydrogen": patch
---

Cart `set` submissions no longer clamp against a non-positive `quantityAvailable`. When the cart fragment selects `ProductVariant.quantityAvailable` and the Storefront API returns `0` (untracked inventory) or a negative number (oversold under the CONTINUE policy), the store used that as the upper bound, so typing a positive quantity removed the line or sent a negative quantity. Those values now set no cap and the requested quantity goes to Shopify, which validates stock and returns the line error. `sanitizeQuantity` now also treats non-finite input such as `Infinity` or `"1e400"` as unparseable and returns `min`, and `min` wins when `max` is below it.
