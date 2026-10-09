---
"@shopify/hydrogen": patch
---

Fix malformed URLs when a locale path prefix has surrounding whitespace.

Before: a prefix like `" /fr-ca/ "` leaked into resolved paths, producing `/ /fr-ca/ /products`.
After: the prefix normalizes to `/fr-ca`, producing `/fr-ca/products`.

Also removes internal dead code; no public API changes.
