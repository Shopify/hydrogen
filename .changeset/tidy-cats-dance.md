---
'@shopify/hydrogen': major
'@shopify/hydrogen-react': major
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
'skeleton': major
---

Updated to Storefront API 2026-01 and Customer Account API 2026-01.

This is a quarterly API version update aligned with Shopify's API release schedule.

**Action Required**: The `cartDiscountCodesUpdate` mutation now requires the `discountCodes` argument. If you have custom cart discount code logic, verify your mutations include this field.

Review the changelogs for other changes that may affect your storefront:
- [Storefront API 2026-01 changelog](https://shopify.dev/changelog?filter=api&api_version=2026-01&api_type=storefront-graphql)
- [Customer Account API 2026-01 changelog](https://shopify.dev/changelog?filter=api&api_version=2026-01&api_type=customer-account-graphql)
