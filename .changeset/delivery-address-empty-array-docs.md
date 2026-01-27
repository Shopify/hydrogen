---
'@shopify/hydrogen': patch
---

`cart.updateDeliveryAddresses` mutation now clears all delivery addresses when passed an empty array

## Breaking Behavior Change in Storefront API 2025-10

The `cartDeliveryAddressesUpdate` mutation now clears all delivery addresses when passed an empty array. This behavior was undefined in previous API versions.

## What Changed

**Before (API ≤ 2025-07):**
Passing an empty array did not update any addresses, essentially a no-op.

**After (API ≥ 2025-10):**
Passing an empty array explicitly clears all delivery addresses from the cart.

## Usage

```typescript
context.cart.updateDeliveryAddresses([])
```

## Migration

If you are relying on `cart.updateDeliveryAddresses([])` in your codebase, verify if the new behavior is compatible with your expectations.

Otherwise, no migration is required.
