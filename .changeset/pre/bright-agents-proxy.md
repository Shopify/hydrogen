---
'@shopify/hydrogen': patch
---

Storefront Agent requests now route through the generic `/__shopify/*` Shopify API proxy. Unprefixed `/agent/buyer-claims` and `/agent/handoff` requests are no longer intercepted and fall through to app routing, where they may return a 404 or catch-all HTML response.
