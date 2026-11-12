---
"@shopify/hydrogen": patch
---

`gql()` now deduplicates shared fragments across Storefront and Customer Account documents, preventing duplicate-fragment errors. Conflicting definitions with the same name throw when the module that composes them loads.
