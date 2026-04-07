---
'@shopify/hydrogen': patch
---

Add `useCustomAuthDomain` option to `createCustomerAccountClient` and `createHydrogenContext`. When set to `true`, the development tunnel domain check logs a warning instead of throwing, enabling use of custom HTTPS setups like ngrok or local HTTPS proxies for Customer Account API OAuth.
