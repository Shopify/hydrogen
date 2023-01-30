---
'@shopify/storefront-kit-react': patch
---

## Breaking Changes on Shopify analytics components

- `useShopifyCookies` - if hasUserConsent is `false`, no cookies will be set
- `sendShopifyAnalytics` - if `hasUserConsent` is false, no analytics will be sent
- `ShopifyAppSource` got rename to `ShopifySalesChannel`
- `getClientBrowserParameters` returns empty string for each field key if run on server
- Added documents on analytics components
