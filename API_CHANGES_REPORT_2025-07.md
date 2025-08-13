# 📊 API Changes Report for Version 2025-07

## Executive Summary
- **Total Changes**: 6 changes across Storefront and Customer Account APIs
- **Breaking Changes**: 1 breaking change identified (Unit Pricing)
- **Action Required**: Unit pricing enum changes require validation

## Customer Account API Changes

### 1. Subscription Discount Data Now Available
**Type**: New Feature
**Effective Date**: 2025-07-01
**Action Required**: No
**Changelog**: https://developers.shopify.com/api-changelog/subscription-discounts-are-now-available-in-the-customer-api

**Description**: 
The Customer Account API now includes a discounts connection on customer subscription contracts, mirroring functionality that already exists in the Admin API. You can now query subscription discount details directly from the Customer Account API.

**Technical Impact**:
- New connection available: `SubscriptionDiscountConnection`
- Affected areas in Hydrogen:
  - Could enhance: `packages/hydrogen/src/customer/` - subscription components
  - Could add to: `templates/skeleton/app/graphql/customer-account/` - subscription queries
- New fields available:
  - `SubscriptionContract.discounts` - Returns discount information
  - Discount amounts and percentages
  - Line item allocations

**Implementation Opportunities**:
- [ ] Create new component for displaying subscription discounts
- [ ] Add discount information to existing subscription views
- [ ] Create helper functions for calculating discounted prices

**Example Usage**:
```graphql
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

### 2. Enhanced Order Filtering
**Type**: Update
**Effective Date**: 2025-05-01
**Action Required**: No
**Changelog**: https://developers.shopify.com/api-changelog/new-filter-options-added-to-orders-connection-in-customer-account-api

**Description**: 
New query parameters `name` and `confirmation_number` added to the orders connection in the GraphQL Customer Account API, enabling more precise order filtering.

**Technical Impact**:
- Enhanced filtering in: `OrderConnection`
- Affected areas:
  - `packages/hydrogen/src/customer/` - order listing components
  - `templates/skeleton/app/routes/account.orders._index.tsx` - order search
- New query parameters:
  - `query.name` - Filter by order name
  - `query.confirmation_number` - Filter by confirmation number

**Implementation Opportunities**:
- [ ] Add search functionality to order history page
- [ ] Create order lookup by confirmation number feature
- [ ] Enhance order filtering UI components

### 3. Unit Pricing Enhancements ⚠️ BREAKING
**Type**: Breaking Change
**Effective Date**: 2025-04-21
**Action Required**: Yes
**Changelog**: https://developers.shopify.com/api-changelog/unit-pricing-api-update

**Description**: 
The `UnitPriceMeasurementMeasuredUnit` enum now supports values for imperial units and counts (e.g., $10/oz, $5/ft, $2/item). This enables merchants to display more relevant and transparent pricing.

**Technical Impact**:
- Breaking change in: `UnitPriceMeasurementMeasuredUnit` enum
- Affected components:
  - `packages/hydrogen-react/src/ProductPrice.tsx`
  - `packages/hydrogen-react/src/Money.tsx`
  - Any component displaying unit prices
- Migration required:
  - Handle potential `null` values for imperial units on older API versions
  - Update unit price display logic

**Required Updates**:
- [ ] Update ProductPrice component to handle new enum values
- [ ] Add null checks for imperial unit values
- [ ] Test with various unit types (metric, imperial, count)

## Storefront API Changes

### 1. Cart Warnings for Discount Codes
**Type**: New Feature
**Effective Date**: 2025-05-19
**Action Required**: No
**Changelog**: https://developers.shopify.com/api-changelog/add-warnings-for-discount-codes

**Description**: 
The Cart object now provides detailed warnings for non-applicable CartDiscountCodes through new CartWarning types, clearly identifying specific reasons why a discount code isn't applicable.

**Technical Impact**:
- New type available: `CartWarning`
- Enhanced field: `CartDiscountCode.applicable`
- Affected components:
  - `packages/hydrogen/src/cart/` - cart components
  - `templates/skeleton/app/components/Cart.tsx`

**Implementation Opportunities**:
- [ ] Display specific discount error messages to users
- [ ] Create UI components for cart warnings
- [ ] Improve discount code validation feedback

**Example Usage**:
```graphql
query CartWithWarnings {
  cart(id: $cartId) {
    discountCodes {
      applicable
      code
    }
    warnings {
      message
      # Additional warning details
    }
  }
}
```

### 2. B2B Company Location Error Handling
**Type**: New Feature
**Effective Date**: 2025-05-10
**Action Required**: No
**Changelog**: https://developers.shopify.com/api-changelog/new-storefront-api-carterrorcode-buyercannotpurchaseforcompanylocation

**Description**: 
New `BUYER_CANNOT_PURCHASE_FOR_COMPANY_LOCATION` CartErrorCode indicates a buyer has lost permission to purchase for their selected company location.

**Technical Impact**:
- New error code in: `CartErrorCode` enum
- Affected areas:
  - `packages/hydrogen/src/cart/` - error handling
  - B2B checkout flows

**Implementation Opportunities**:
- [ ] Add B2B-specific error handling
- [ ] Create error messages for B2B permission issues
- [ ] Enhance B2B checkout flow validation

### 3. Selling Plan Error Improvements
**Type**: New Feature
**Effective Date**: 2025-03-27
**Action Required**: No
**Changelog**: https://developers.shopify.com/api-changelog/storefront-api-cart-exposes-selling-plan-errors

**Description**: 
Cart mutations now expose specific user errors for selling plan scenarios:
- `VARIANT_REQUIRES_SELLING_PLAN`: When merchandise requires a selling plan but none provided
- `SELLING_PLAN_NOT_APPLICABLE`: When selling plan is not applicable to merchandise

**Technical Impact**:
- New error codes in cart mutations
- Affected components:
  - `packages/hydrogen/src/cart/` - cart mutation handling
  - Subscription product components

**Implementation Opportunities**:
- [ ] Improve subscription product error handling
- [ ] Add validation for selling plan requirements
- [ ] Create helper functions for selling plan validation

## Breaking Changes Summary

### ⚠️ Critical Breaking Changes

1. **Unit Pricing Enum Expansion**
   - **Impact**: Components using `UnitPriceMeasurementMeasuredUnit` may receive null values for imperial units if not on 2025-07
   - **Migration Path**: 
     ```typescript
     // Add null checks for unit values
     if (unitPriceMeasurement?.measuredType) {
       // Handle imperial units
     }
     ```
   - **Affected Areas**: 
     - `packages/hydrogen-react/src/ProductPrice.tsx`
     - `packages/hydrogen-react/src/Money.tsx`
   - **Priority**: P0 - Must validate before merge

## Implementation Checklist

### Required Updates (P0 - Blockers)
- [ ] Validate unit pricing components handle new enum values
- [ ] Add null checks for imperial unit measurements
- [ ] Test B2B flows if applicable

### Recommended Enhancements (P1 - This PR)
- [ ] Implement cart warning display for discount codes
- [ ] Add selling plan error handling improvements
- [ ] Update order search to use new filtering options

### Future Opportunities (P2 - Follow-up PRs)
- [ ] Create subscription discount display components
- [ ] Build enhanced B2B error handling
- [ ] Add comprehensive unit pricing examples
- [ ] Implement order lookup by confirmation number

## Offer for Deep Investigation

**Would you like me to perform a deep technical investigation for any of these changes?**

I can:
- Search the codebase for all affected components
- Identify specific GraphQL queries that could be enhanced
- Create detailed implementation plans with exact file paths
- Generate code examples for new features
- Map out testing requirements

Please specify which API changes you'd like me to investigate in detail.