---
"@shopify/hydrogen": patch
---

The Storefront API client no longer caches a response whose `Cache-Control` header contains `private` or `no-store`, even when the query passes a `cache` strategy such as `Cache.long()`. Such a response also makes the final response private when you call `applyResponseHeaders()`, so a CDN doesn't cache the page built from it. Before, the client stored the response and could serve it to other buyers whose requests built the same cache key.
