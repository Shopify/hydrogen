---
'@shopify/cli-hydrogen': patch
---

Warn instead of silently falling back when `hydrogen codegen` can't match the Storefront API project because its `schema` is an object-style pointer (e.g. a live introspection endpoint) rather than a string path ending in `storefront.schema.json`.
