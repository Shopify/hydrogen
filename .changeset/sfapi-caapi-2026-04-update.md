---
'@shopify/hydrogen': major
'@shopify/hydrogen-react': major
'@shopify/cli-hydrogen': patch
'skeleton': major
---

Update Storefront API and Customer Account API from 2026-01 to 2026-04.

## Breaking changes

**JSON metafield values limited to 128KB**: When using API version 2026-04 or later, JSON type metafield writes are limited to 128KB. This affects cart metafield mutations (`cartMetafieldsSet`). Apps that used JSON metafields before April 1, 2026 are grandfathered at the existing 2MB limit. Large metafield values continue to be readable by all API versions.

## New features

**New `MERCHANDISE_LINE_TRANSFORMERS_RUN_ERROR` cart error code**: The Storefront API now returns a specific `MERCHANDISE_LINE_TRANSFORMERS_RUN_ERROR` error code when a Cart Transform Function encounters a runtime error during cart operations such as `cartCreate` or `cartLinesAdd`. Previously, these failures returned a generic `INVALID` error code.

## Changelog links

- [Storefront API 2026-04 changelog](https://shopify.dev/changelog?filter=api&api_version=2026-04&api_type=storefront-graphql)
- [Customer Account API 2026-04 changelog](https://shopify.dev/changelog?filter=api&api_version=2026-04&api_type=customer-account-graphql)
