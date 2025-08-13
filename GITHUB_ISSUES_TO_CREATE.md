# GitHub Issues to Create for API Version 2025-07 Update

## P0 - Blockers (Must Fix)

### Issue 1: Handle null imperial units in ProductPrice component
**Title**: [2025-07 API UPDATE] Handle null imperial units gracefully in ProductPrice component

**Description**:
## Overview
The 2025-07 API update introduces imperial units (oz, ft) and count measurements to the `UnitPriceMeasurementMeasuredUnit` enum. This is a breaking change where the API returns `null` for imperial units if not using API version 2025-07 or later.

## API Version
- **Version**: 2025-07
- **API**: Storefront/Customer Account
- **Type**: Breaking Change
- **Changelog**: [Unit Pricing API Update](https://developers.shopify.com/api-changelog/unit-pricing-api-update)

## Technical Details
- New enum values include imperial units: `OUNCE`, `POUND`, `FOOT`, `YARD`, etc.
- Count measurements: `ITEM`
- API returns `null` for these new units when using older API versions

## Implementation Plan
- [ ] Update ProductPrice component to handle null unit measurements
- [ ] Add fallback display logic for null units
- [ ] Create formatting helpers for imperial units
- [ ] Add unit tests for imperial unit display

## Acceptance Criteria
- [ ] ProductPrice component gracefully handles null unit measurements
- [ ] Imperial units display correctly when available
- [ ] No runtime errors when unit is null
- [ ] Tests cover both null and imperial unit scenarios

## Files to Update
- `packages/hydrogen-react/src/ProductPrice.tsx` - Add null handling and imperial unit formatting
- `packages/hydrogen-react/src/ProductPrice.test.tsx` - Add test cases

**Priority**: P0 - Breaking change that must be handled

---

## P1 - Recommended Enhancements

### Issue 2: Implement Cart warning display for discount codes
**Title**: [2025-07 API UPDATE] Add Cart warning display component for discount codes

**Description**:
## Overview
The 2025-07 API update introduces detailed warnings for non-applicable discount codes through new `CartWarning` types, replacing the simple `applicable: false` flag.

## API Version
- **Version**: 2025-07
- **API**: Storefront
- **Type**: New Feature
- **Changelog**: [Cart Warnings](https://developers.shopify.com/api-changelog/add-warnings-for-discount-codes)

## Technical Details
- New `CartWarning` type provides detailed reasons why discount codes aren't applicable
- Available on `Cart.warnings` field
- Improves user feedback for discount code issues

## Implementation Plan
- [ ] Create CartWarning display component
- [ ] Update CartProvider to expose warning data
- [ ] Add warning message formatting helpers
- [ ] Update skeleton template with warning display example
- [ ] Add Storybook stories for different warning types

## Acceptance Criteria
- [ ] CartWarning component displays all warning types
- [ ] Warnings are accessible and properly styled
- [ ] CartProvider exposes warnings to consumers
- [ ] Skeleton template demonstrates usage
- [ ] Tests cover all warning scenarios

## Files to Update
- `packages/hydrogen-react/src/CartWarning.tsx` - New component (create)
- `packages/hydrogen-react/src/CartProvider.tsx` - Expose warnings
- `packages/hydrogen/src/cart/CartForm.tsx` - Display warnings
- `templates/skeleton/app/components/Cart.tsx` - Add warning display

**Priority**: P1 - Enhances user experience

---

### Issue 3: Add subscription discount support in Customer Account API
**Title**: [2025-07 API UPDATE] Add support for subscription discount queries

**Description**:
## Overview
Customer Account API now includes subscription discount data that was previously only available through the Admin API.

## API Version
- **Version**: 2025-07
- **API**: Customer Account
- **Type**: New Feature
- **Changelog**: [Subscription Discounts](https://developers.shopify.com/api-changelog/subscription-discounts-are-now-available-in-the-customer-api)

## Technical Details
- New `SubscriptionDiscountConnection` on subscription contracts
- Access discount types, values, and line-item allocations
- Mirrors Admin API functionality

## Implementation Plan
- [ ] Add subscription discount fragments to customer queries
- [ ] Create helper functions for discount data formatting
- [ ] Update customer account types
- [ ] Add example queries to skeleton template
- [ ] Document subscription discount usage

## Acceptance Criteria
- [ ] Subscription discounts can be queried through customer account
- [ ] Helper functions format discount data correctly
- [ ] Types are properly exported
- [ ] Documentation includes examples
- [ ] Tests cover discount query scenarios

## Files to Update
- `packages/hydrogen/src/customer/types.ts` - Add discount types
- `packages/hydrogen/src/customer/queries.ts` - Add discount fragments
- `templates/skeleton/app/graphql/customer-account/` - Add example queries

**Priority**: P1 - New functionality

---

### Issue 4: Enhance order filtering with new query parameters
**Title**: [2025-07 API UPDATE] Add order search by name and confirmation number

**Description**:
## Overview
New query parameters `name` and `confirmation_number` added to the orders connection in Customer Account API for precise order filtering.

## API Version
- **Version**: 2025-07
- **API**: Customer Account
- **Type**: Update
- **Changelog**: [Order Filtering](https://developers.shopify.com/api-changelog/new-filter-options-added-to-orders-connection-in-customer-account-api)

## Technical Details
- Filter orders by order name
- Filter by confirmation number
- Enables order search functionality

## Implementation Plan
- [ ] Update order query helpers to support new parameters
- [ ] Add order search component to skeleton template
- [ ] Create order lookup utilities
- [ ] Add TypeScript types for new parameters
- [ ] Document usage patterns

## Acceptance Criteria
- [ ] Orders can be filtered by name and confirmation number
- [ ] Search component works in skeleton template
- [ ] TypeScript types are complete
- [ ] Documentation shows usage examples
- [ ] Tests cover search scenarios

## Files to Update
- `packages/hydrogen/src/customer/types.ts` - Add query parameter types
- `templates/skeleton/app/routes/account.orders._index.tsx` - Add search UI
- `templates/skeleton/app/graphql/customer-account/CustomerOrdersQuery.ts` - Update query

**Priority**: P1 - Improves order management UX

---

### Issue 5: Add selling plan error handling
**Title**: [2025-07 API UPDATE] Implement selling plan error messages

**Description**:
## Overview
Enhanced error handling for selling plans with specific user errors for missing or inapplicable selling plans.

## API Version
- **Version**: 2025-07
- **API**: Storefront
- **Type**: New Feature
- **Changelog**: [Selling Plan Errors](https://developers.shopify.com/api-changelog/storefront-api-cart-exposes-selling-plan-errors)

## Technical Details
- `VARIANT_REQUIRES_SELLING_PLAN` - When selling plan required but not provided
- `SELLING_PLAN_NOT_APPLICABLE` - When selling plan doesn't apply

## Implementation Plan
- [ ] Add selling plan error handling to cart mutations
- [ ] Create user-friendly error messages
- [ ] Update cart forms to display selling plan errors
- [ ] Add validation helpers
- [ ] Document error handling patterns

## Acceptance Criteria
- [ ] Selling plan errors are caught and displayed
- [ ] Error messages are clear and actionable
- [ ] Cart forms handle both error types
- [ ] Documentation includes examples
- [ ] Tests cover error scenarios

## Files to Update
- `packages/hydrogen/src/cart/CartForm.tsx` - Add error handling
- `packages/hydrogen/src/cart/createCartHandler.ts` - Handle new errors
- `templates/skeleton/app/components/Cart.tsx` - Display errors

**Priority**: P1 - Improves subscription commerce

---

## P2 - Future Opportunities

### Issue 6: Add B2B error handling for company location permissions
**Title**: [2025-07 API UPDATE] Handle B2B company location permission errors

**Description**:
Brief: Implement handling for new `BUYER_CANNOT_PURCHASE_FOR_COMPANY_LOCATION` error code for B2B scenarios.

**Priority**: P2 - Can be implemented in follow-up PR

---

## Notes for PR Description
These issues should be referenced in the PR description with a tracking table showing which are addressed in this PR vs. created for follow-up work.