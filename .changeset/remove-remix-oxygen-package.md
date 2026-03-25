---
'@shopify/hydrogen': patch
---

Removed `@shopify/remix-oxygen` from the monorepo. This package was deprecated in the previous release. Import types and utilities directly from `react-router`. Use `createRequestHandler` and `getStorefrontHeaders` from `@shopify/hydrogen/oxygen` instead.
