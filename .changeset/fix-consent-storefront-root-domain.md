---
'@shopify/hydrogen': patch
---

Fix `useCustomerPrivacy` so the Shopify Customer Privacy API stops emitting failed consent-sync requests to malformed URLs like `https://.example.com/api/unstable/graphql.json`.

Since `2026.4.0`, Hydrogen sets `window.Shopify.customerPrivacy.backendConsentEnabled = true`, which makes the consent script issue a second SFAPI fetch using `storefrontRootDomain` as a hostname and race it against the primary SFAPI fetch. Hydrogen had been passing `storefrontRootDomain` with a legacy leading dot (e.g. `.example.com`), which produced malformed URLs and `Failed to fetch` errors when the race lost to the resulting CSP `connect-src` violation.

`storefrontRootDomain` now matches the public [Customer Privacy API contract](https://shopify.dev/docs/api/consent-tracking) (bare hostname, no leading dot) and is omitted entirely when the same-origin SFAPI proxy is enabled, letting the consent script route both requests through the proxy.
