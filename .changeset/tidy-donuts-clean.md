---
"@shopify/hydrogen": patch
---

Fix malformed URLs when a locale path prefix has surrounding whitespace: a prefix like `" /fr-ca/ "` now normalizes to `/fr-ca` instead of leaking spaces and slashes into resolved paths. Also removes internal dead code; no public API changes.
