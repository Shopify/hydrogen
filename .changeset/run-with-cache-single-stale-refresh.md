---
"@shopify/hydrogen": patch
---

`createRunWithCache`, and the Storefront client's `cache`, now start one background refresh per cache key at a time in each isolate. Before, every request that hit a stale entry started its own refresh, so the number of origin reads grew with traffic while a refresh was still in flight. The lock is kept in memory per `createRunWithCache` instance and is released when the refresh finishes, fails, or is skipped.
