---
"@shopify/hydrogen": patch
---

Re-export `ShopifyProvider`, `useShop`, and `SFAPI_VERSION` from `@shopify/hydrogen` so these can be imported without reaching into `@shopify/hydrogen-react` directly. Add `apiVersion` to the `storefront` object returned by `createStorefrontClient`, giving loaders access to the resolved Storefront API version.
