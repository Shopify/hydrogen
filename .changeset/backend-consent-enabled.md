---
"@shopify/hydrogen": major
---

Make Storefront API proxy mandatory and enable backend consent mode, supporting the deprecation of the `_tracking_consent` cookie in favor of server-set cookies via the SF API proxy.

- **Breaking**: `proxyStandardRoutes` option has been removed from `createRequestHandler`. The Storefront API proxy is now always enabled. If your load context does not include a `storefront` instance, the request handler will now throw an error instead of logging a warning.
- **New**: `window.Shopify.customerPrivacy.backendConsentEnabled` is now set to `true` before the Customer Privacy API script loads. This tells the consent library to use the new server-set cookie mode instead of the legacy `_tracking_consent` JS cookie. The flag is installed via a `window.Shopify` property interceptor so it survives the CDN's `window.Shopify = {}` reset cycle and is readable before the full API is assigned.
