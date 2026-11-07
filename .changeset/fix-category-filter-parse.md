---
"@shopify/hydrogen": patch
---

Fix category filter parsing in `parseCollectionParams`. Category filters serialized as `filter.p.category` in collection URLs are now correctly parsed into `ProductFilter` objects instead of being dropped.
