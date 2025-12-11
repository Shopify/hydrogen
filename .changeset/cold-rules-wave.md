---
'@shopify/hydrogen': patch
---

This version adds support for the new cookie system in Shopify (`_shopify_analytics` and `_shopify_marketing` http-only cookies). It is backward compatible and still supports the deprecated `_shopify_y` and `_shopify_s` cookies.

- `createRequestHandler` can now be used for every Hydrogen app, not only the ones deployed to Oxygen. It is now exported from `@shopify/hydrogen`.
- A new Storefront API proxy is now available in Hydrogen's `createRequestHandler`. This will be used to obtain http-only cookies from Storefront API. In general, it should be transparent but it can be disabled with the `proxyStandardRoutes` option.
- `Analytics.Provider` component and `useCustomerPrivacy` hook now make a request internally to the mentioned proxy to obtain cookies in the storefront domain.
