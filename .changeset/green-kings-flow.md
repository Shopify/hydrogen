---
'@shopify/hydrogen': patch
---

Added a public `handleProxyStandardRoutes()` export so custom server runtimes like Next.js can reuse Hydrogen's built-in Storefront API proxy handling for `/api/.../graphql.json` requests.
