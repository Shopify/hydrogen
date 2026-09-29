---
"@shopify/hydrogen": patch
---

Log Storefront API errors from the URL redirect lookup in `handleShopifyRedirects`, such as `THROTTLED`, through the Hydrogen logger, as network failures already are. Before, these errors were dropped silently and the request fell through to the 404 as if no redirect existed.
