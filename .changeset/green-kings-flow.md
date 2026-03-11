---
'@shopify/hydrogen': patch
---

Extracted `handleProxyStandardRoutes()` for use outside React Router contexts. Requires a `Storefront` client instance to proxy `/api/.../graphql.json` requests.
