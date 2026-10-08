---
"@shopify/hydrogen": patch
---

Fix `createPredictiveSearchServerHandlers()` ignoring its configured `limit` when a request sends an empty, whitespace-only, or non-numeric `limit` query parameter. Previously `?limit=` searched with a limit of 1 and `?limit=abc` used Hydrogen's default of 5.
