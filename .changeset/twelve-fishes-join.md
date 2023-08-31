---
'demo-store': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

- Fix product page redirecting on first variant without search params
- VariantSelector - Allow search params to be optionally passed in to override the search param obtained from useLocation
