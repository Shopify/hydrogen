---
'@shopify/hydrogen': patch
---

Introduce a new default caching strategy with a `max-age` value of 1 second, and a `stale-while-revalidate` value of 1 day. When updating to this version of Hydrogen, note that if you would like to continue to use `CacheShort` as the default (10 second cache) to decrease risk of stale data (but also increase load times on low traffic pages), it's important to go and manually specify your caching strategy.
