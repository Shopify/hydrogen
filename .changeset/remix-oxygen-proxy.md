---
'@shopify/remix-oxygen': minor
---

Added built-in Storefront API proxy support to `createRequestHandler`.

- New `proxyStandardRoutes` option (default: `true`) automatically proxies `/api/.../graphql.json` requests via `storefront.forward()`
- New `collectTrackingInformation` option (default: `true`) forwards cookies and server-timing headers from SFAPI subrequests to the browser
- Sets `_sfapi_proxy` server-timing header for document requests to signal proxy availability
- Updated `getStorefrontHeaders` to check `sec-purpose` header before `purpose` header
