---
'@shopify/hydrogen': patch
'@shopify/hydrogen-react': patch
---

Support Shopify's new consolidated cookie architecture.

- Added `createRequestHandler` export to `@shopify/hydrogen` with built-in SFAPI proxy support
- Added `getTrackingValues()` utility to read tracking values (`uniqueToken`/`visitToken`) from `server-timing` headers via the Performance API
- Updated `useShopifyCookies` hook with `fetchTrackingValues` and `ignoreDeprecatedCookies` options
- Added `sameDomainForStorefrontApi` option to `ShopifyProvider` for proxy-aware consent libraries
- Storefront client now collects and forwards cookies and server-timing headers from subrequests
