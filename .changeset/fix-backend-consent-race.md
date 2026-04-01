---
"@shopify/hydrogen": patch
---

Fix race condition where the CDN consent script could read `backendConsentEnabled` as `undefined` during the `window.Shopify = {}` reset cycle, causing the privacy consent API to initialize in legacy mode instead of backend consent mode. In legacy mode with `ignoreDeprecatedCookies: true`, no tracking cookies were written after consent acceptance.
