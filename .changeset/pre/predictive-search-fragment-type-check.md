---
"@shopify/hydrogen": patch
---

`makePredictiveSearchQueries()` and `createPredictiveSearchServerHandlers({ fragments })` now reject custom fragments that target a type whose name only starts with the expected one, such as `fragment PredictiveSearchProductFragment on ProductVariant`. These previously passed the local check and only failed once the Storefront API rejected the query.
