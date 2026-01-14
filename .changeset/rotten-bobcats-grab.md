---
'@shopify/hydrogen-react': patch
---

New export `getTrackingValues` to obtain information for analytics and marketing. Use this instead of `getShopifyCookies` (which is now deprecated).

`useShopifyCookies` now accepts a `fetchTrackingValues` parameter that can be used to make a Storefront API request and obtain Shopify http-only cookies, `_shopify_analytics` and `_shopify_marketing` (which replace the deprecated `_shopify_y` and `_shopify_s` cookies).
