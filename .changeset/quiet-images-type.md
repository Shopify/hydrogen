---
'@shopify/hydrogen': patch
---

Fix `og:image:type` falling back to `image/jpeg` for media URLs that include a query string, such as Shopify CDN URLs ending in `?v=...`.
