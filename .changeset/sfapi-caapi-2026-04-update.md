---
'@shopify/hydrogen': major
'@shopify/hydrogen-react': major
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
'skeleton': major
---

Update Storefront API and Customer Account API from 2026-01 to 2026-04.

## Breaking changes

**JSON metafield values limited to 128KB**: When using API version 2026-04 or later, the Storefront API limits JSON type metafield writes to 128KB. This limit applies at the API level - Hydrogen passes through to the Storefront API without additional restriction. Apps that used JSON metafields before April 1, 2026 are grandfathered at the existing 2MB limit. Large metafield values continue to be readable by all API versions.

## New features

**New `MERCHANDISE_LINE_TRANSFORMERS_RUN_ERROR` cart error code**: Cart operations (`cartCreate`, `cartLinesAdd`, etc.) now return a specific `MERCHANDISE_LINE_TRANSFORMERS_RUN_ERROR` error code when a Cart Transform Function fails at runtime, instead of the previous generic `INVALID` error code. If you handle cart errors in your storefront code, you may want to add handling for this new code.

## Changelog links

- [Storefront API 2026-04 changelog](https://shopify.dev/changelog?filter=api&api_version=2026-04&api_type=storefront-graphql)
- [Customer Account API 2026-04 changelog](https://shopify.dev/changelog?filter=api&api_version=2026-04&api_type=customer-account-graphql)
