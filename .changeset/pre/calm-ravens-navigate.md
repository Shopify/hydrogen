---
'@shopify/hydrogen': patch
---

Stop manually forwarding analytics events to PerfKit's SPA navigation methods. PerfKit will consume the standard `shopify:page:view` event directly.
