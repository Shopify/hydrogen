---
"@shopify/hydrogen": patch
---

Fix React `usePredictiveSearchActions()` returning `search` and `clear` functions that silently stopped working after a `PredictiveSearchProvider` prop change recreated the store. The actions now keep a stable identity and always target the provider's current store, matching the Vue bindings.
