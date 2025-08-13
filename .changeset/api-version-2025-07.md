---
'@shopify/hydrogen': major
'@shopify/hydrogen-react': major
'@shopify/cli-hydrogen': patch
'skeleton': major
---

Update Storefront API and Customer Account API to version 2025-07

## What's Changed

### Storefront API Updates
- **Cart Warnings**: Cart object now exposes warnings for non-applicable discount codes via new `CartWarning` types
- **Selling Plan Errors**: Enhanced error handling with `VARIANT_REQUIRES_SELLING_PLAN` and `SELLING_PLAN_NOT_APPLICABLE` errors
- **B2B Error Code**: New `BUYER_CANNOT_PURCHASE_FOR_COMPANY_LOCATION` CartErrorCode for B2B permission scenarios
- **Unit Pricing**: Support for imperial units (oz, ft) and count measurements in `UnitPriceMeasurementMeasuredUnit` enum

### Customer Account API Updates
- **Subscription Discounts**: New discounts connection on subscription contracts for accessing discount data directly
- **Order Filtering**: Added `name` and `confirmation_number` query parameters to orders connection for precise filtering
- **Unit Pricing**: Same imperial units and count support as Storefront API

## Breaking Changes
- **Unit Pricing**: API returns `null` for imperial units and counts if not using version 2025-07 or later

## Action Required
- Update to API version 2025-07 to access new features
- Test unit pricing display with imperial units where applicable
- Review cart warning handling for improved discount code feedback