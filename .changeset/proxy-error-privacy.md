---
'@shopify/hydrogen': patch
---

Return a generic error message when Shopify proxies encounter an exception in production, preventing internal request details from being exposed to clients. Development builds retain detailed error messages, and full errors remain available through the configured server logger in both builds.
