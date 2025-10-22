---
'@shopify/hydrogen': patch
---

Document `cartDeliveryAddressesUpdate` empty array behavior for API 2025-10+

## Breaking Behavior Change in Storefront API 2025-10

The `cartDeliveryAddressesUpdate` mutation now clears all delivery addresses when passed an empty array. This behavior was undefined in previous API versions.

## What Changed

**Before (API ≤ 2025-07):**
Passing an empty array had undefined behavior (likely ignored or caused an error).

**After (API ≥ 2025-10):**
Passing an empty array explicitly clears all delivery addresses from the cart.

## Usage Examples

### Clearing All Delivery Addresses

**New in 2025-10** - Use empty array to clear addresses:

```typescript
import {createCartHandler} from '@shopify/hydrogen';

export async function action({context}) {
  const cartHandler = createCartHandler({
    storefront: context.storefront,
    getCartId: context.cart.getCartId,
  });

  // Clear all delivery addresses from cart
  const result = await cartHandler.updateDeliveryAddresses([]);

  return result;
}
```

### Updating Specific Addresses

Standard usage remains unchanged:

```typescript
// Update delivery addresses with new address
const result = await cartHandler.updateDeliveryAddresses([
  {
    id: 'gid://shopify/CartSelectableAddress/existing-address',
    selected: true,
    address: {
      deliveryAddress: {
        address1: '123 Main Street',
        city: 'New York',
        countryCode: 'US',
        zip: '10001',
      },
    },
  },
]);
```

### Migration Guide

**If you're passing empty arrays:**

```typescript
// BEFORE: This had undefined behavior
await cartHandler.updateDeliveryAddresses([]);

// AFTER (2025-10): This now clears all addresses
await cartHandler.updateDeliveryAddresses([]);
// ⚠️ Verify this is your intended behavior!
```

**If you want to clear addresses:**

```typescript
// BEFORE (workaround): Had to remove addresses individually
const addressIds = cart.delivery.addresses.map((addr) => addr.id);
await cartHandler.removeDeliveryAddresses(addressIds);

// AFTER (2025-10): Simply pass empty array
await cartHandler.updateDeliveryAddresses([]);
```
