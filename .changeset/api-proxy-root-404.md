---
"@shopify/hydrogen": patch
---

Requests to the bare `/__shopify` API proxy prefix (`/__shopify` or `/__shopify/`) now return `404` instead of proxying the Online Store home page, which redirected buyers to the Online Store or the checkout domain. Paths under the prefix, such as `/__shopify/cart.js`, are still proxied.
