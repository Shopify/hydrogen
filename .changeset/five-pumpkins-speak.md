---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

Serve assets from a separate domain when running the dev server, to better simulate cross-domain behaviors. This makes it more realistic to work with CORS requests, content security policies, and CDN paths in development.
