---
'skeleton': patch
'@shopify/hydrogen': patch
---

Update `createWithCache` to make it harder to accidentally cache undesired results. `createWithCache` now returns an object with two utility functions:

- `withCache.fetch` to be used for fetch requests
- the more advanced `withCache.run` to execute any asynchronous operation
