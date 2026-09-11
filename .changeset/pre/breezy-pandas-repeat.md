---
'@shopify/hydrogen': patch
---

Fix editor autocomplete on `createStorefrontClient`: the `type` discriminant now suggests all client types and `config` completions narrow to the selected type, instead of resolving against the first overload only.
