# 📊 API Changes Report for Version 2025-07

## Executive Summary
- **Total Changes**: 6 changes across Storefront and Customer Account APIs
- **Breaking Changes**: 1 breaking change (Unit Pricing)
- **Action Required**: 1 change requires attention for unit pricing compatibility

## Customer Account API Changes

### 1. Customer Account API now includes subscription discount data
**Type**: New Feature  
**Effective Date**: 2025-07-01  
**Action Required**: No  
**Changelog**: [Link](https://developers.shopify.com/api-changelog/subscription-discounts-are-now-available-in-the-customer-api)

**Description**: 
Previously, subscription discount data was only available through the GraphQL Admin API. Now, it's also available through the Customer Account API with a new discounts connection on customer subscription contracts.

**Technical Impact**:
- Affected files/components in Hydrogen:
  - `packages/hydrogen/src/customer/*` - May need to update customer queries
  - `templates/skeleton/app/graphql/customer-account/*` - Could enhance with discount queries
- New types/fields available:
  - `SubscriptionDiscountConnection` - New connection type
  - `SubscriptionContract.discounts` - Access discount details
- No deprecated fields

**Implementation Opportunities**:
- [ ] Add support for querying subscription discounts in customer account helpers
- [ ] Update skeleton template with example subscription discount queries
- [ ] Create helper functions for formatting subscription discount data

**Example Usage**:
```graphql
# New query capability example
query CustomerSubscriptionWithDiscounts {
  customer {
    subscriptionContracts(first: 10) {
      edges {
        node {
          id
          discounts(first: 5) {
            edges {
              node {
                id
                value
                # Additional discount fields
              }
            }
          }
        }
      }
    }
  }
}
```

### 2. New filter options added to orders connection
**Type**: Update  
**Effective Date**: 2025-05-01  
**Action Required**: No  
**Changelog**: [Link](https://developers.shopify.com/api-changelog/new-filter-options-added-to-orders-connection-in-customer-account-api)

**Description**: 
New query parameters `name` and `confirmation_number` added to the orders connection, enabling more precise order filtering.

**Technical Impact**:
- Affected files/components in Hydrogen:
  - `packages/hydrogen/src/customer/types.ts` - May need type updates
  - Customer account order queries could be enhanced
- New query parameters:
  - `name` - Filter by order name
  - `confirmation_number` - Filter by confirmation number

**Implementation Opportunities**:
- [ ] Add order search functionality to skeleton template
- [ ] Create helper function for order lookup by confirmation number
- [ ] Enhance customer order history with search capabilities

## Storefront API Changes

### 1. Cart warnings for non-applicable discount codes
**Type**: New Feature  
**Effective Date**: 2025-05-19  
**Action Required**: No  
**Changelog**: [Link](https://developers.shopify.com/api-changelog/add-warnings-for-discount-codes)

**Description**: 
Cart object now provides detailed warnings for non-applicable discount codes through new CartWarning types, replacing the simple `applicable: false` flag.

**Technical Impact**:
- Affected files/components in Hydrogen:
  - `packages/hydrogen/src/cart/CartForm.tsx` - Could display warnings
  - `packages/hydrogen/src/cart/optimistic/*` - May need warning handling
  - `packages/hydrogen-react/src/CartProvider.tsx` - Could expose warnings
- New types/fields available:
  - `CartWarning` - New warning type
  - `Cart.warnings` - Collection of warnings

**Implementation Opportunities**:
- [ ] Add CartWarning display component
- [ ] Update CartProvider to expose warning data
- [ ] Create helper to format warning messages for users
- [ ] Update skeleton template with discount warning handling

### 2. New B2B Cart Error Code
**Type**: New Feature  
**Effective Date**: 2025-05-10  
**Action Required**: No  
**Changelog**: [Link](https://developers.shopify.com/api-changelog/new-storefront-api-carterrorcode-buyercannotpurchaseforcompanylocation)

**Description**: 
New `BUYER_CANNOT_PURCHASE_FOR_COMPANY_LOCATION` CartErrorCode for B2B scenarios where a buyer loses permission to purchase for their selected company location.

**Technical Impact**:
- New enum value in `CartErrorCode`
- B2B-specific error handling may be needed

**Implementation Opportunities**:
- [ ] Add B2B error handling in cart components
- [ ] Create documentation for B2B cart scenarios

### 3. Imperial units and counts in unit pricing
**Type**: Breaking Change  
**Effective Date**: 2025-04-21  
**Action Required**: Yes  
**Changelog**: [Link](https://developers.shopify.com/api-changelog/unit-pricing-api-update)

**Description**: 
The `UnitPriceMeasurementMeasuredUnit` enum now supports imperial units (oz, ft) and count measurements, enabling more transparent pricing display.

**Technical Impact**:
- Affected files/components in Hydrogen:
  - `packages/hydrogen-react/src/ProductPrice.tsx` - May need imperial unit handling
  - `packages/hydrogen-react/src/Money.tsx` - Could format imperial units
- New enum values:
  - Imperial units: `OUNCE`, `POUND`, `FOOT`, `YARD`, etc.
  - Count: `ITEM`
- **Breaking**: Returns `null` for imperial units if not using API 2025-07+

**Implementation Opportunities**:
- [ ] Add imperial unit formatting to ProductPrice component
- [ ] Create unit conversion helpers
- [ ] Update Money component to handle new units
- [ ] Add examples for imperial unit pricing display

### 4. Selling plan error enhancements
**Type**: New Feature  
**Effective Date**: 2025-03-27  
**Action Required**: No  
**Changelog**: [Link](https://developers.shopify.com/api-changelog/storefront-api-cart-exposes-selling-plan-errors)

**Description**: 
Enhanced error handling for selling plans with specific user errors for missing or inapplicable selling plans.

**Technical Impact**:
- New error codes:
  - `VARIANT_REQUIRES_SELLING_PLAN` - When selling plan is required but not provided
  - `SELLING_PLAN_NOT_APPLICABLE` - When selling plan doesn't apply to merchandise
- Cart mutations now provide clearer error messages

**Implementation Opportunities**:
- [ ] Add selling plan validation in cart helpers
- [ ] Create error messages for selling plan issues
- [ ] Update skeleton template with selling plan error handling

## Breaking Changes Summary

### ⚠️ Critical Breaking Changes
1. **Unit Pricing Imperial Units**
   - **Impact**: API returns `null` for imperial units and counts if not using version 2025-07
   - **Migration Path**: Update to API version 2025-07 to access imperial units
   - **Affected Areas**: ProductPrice, Money components, unit price display
   - **Priority**: P0 - Must fix before merge if displaying unit prices

## Implementation Checklist

### Required Updates (P0 - Blockers)
- [x] Update API version constants to 2025-07
- [x] Regenerate GraphQL types
- [ ] Handle `null` imperial units gracefully in ProductPrice component
- [ ] Test unit pricing with new measurement types

### Recommended Enhancements (P1 - This PR)
- [ ] Implement Cart warning display for discount codes
- [ ] Add support for subscription discount queries
- [ ] Update order filtering with new parameters

### Future Opportunities (P2 - Follow-up PRs)
- [ ] Create comprehensive B2B error handling
- [ ] Add selling plan error messages
- [ ] Build imperial unit conversion utilities
- [ ] Enhance skeleton template with all new features

## Validation Issues Found

### Build Issues
- **mini-oxygen**: Build failure due to missing `sendResponse` export from `@mjackson/node-fetch-server` (unrelated to API update)
- **hydrogen**: TypeScript errors due to dependency on hydrogen-react built types

### TypeScript Errors
The hydrogen package has multiple TypeScript errors related to missing type imports from `@shopify/hydrogen-react/storefront-api-types`. This is expected as the packages need proper rebuilding after the API update.

### Recommended Resolution
1. Fix mini-oxygen build issue (unrelated to API update)
2. Ensure hydrogen-react is fully built before building hydrogen
3. Run full test suite after successful build

## Testing Recommendations
1. Test unit pricing with imperial units (oz, ft) and counts
2. Verify cart warnings display for invalid discount codes
3. Test subscription discount queries in Customer Account API
4. Validate order filtering with name and confirmation number
5. Test B2B scenarios for new error code
6. Verify selling plan error messages

## Migration Guide for Users
1. Update to Hydrogen version with 2025-07 API support
2. Review unit pricing implementation if using imperial measurements
3. Enhance discount code feedback using new cart warnings
4. Leverage new customer account features for subscriptions
5. Implement order search using new filter parameters