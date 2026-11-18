---
"@shopify/hydrogen": patch
---

`initializeShopifyScripts()` no longer sends a `shopify:page:view` event when `history.replaceState` changes only the query, as a variant selection does. Pushes, back and forward navigations, and replacements that change the path still send one.
