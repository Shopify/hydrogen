---
'@shopify/hydrogen': patch
---

Clarify the `InMemoryCache` docs: cached entries are per server process, are not shared between instances, and are lost on restart, so it is intended for local development while Oxygen handles caching in production. Also fixes a typo in the Customer Privacy API type docs.
