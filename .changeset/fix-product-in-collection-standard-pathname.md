---
"@shopify/hydrogen": patch
---

Give a collection-scoped product match without a collection handle the product's standard path. A `productInCollection` template that leaves out `:collectionHandle` used to match with a `standardPathname` of `/collections/:collectionHandle/products/<handle>`, placeholder included. It is now `/products/<handle>`, and `templates.standard` is the product template to match.
