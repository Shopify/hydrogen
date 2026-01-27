---
'@shopify/hydrogen': minor
---

Add `cartDeliveryAddressesReplaceDefault` to handle the new `cartDeliveryAddressesReplace` Storefront API mutation (2025-10)

This new mutation replaces all delivery addresses on a cart in a single operation.

**Usage via cart handler:**
```typescript
const result = await cart.replaceDeliveryAddresses([
  {
    address: {
      deliveryAddress: {
        address1: '123 Main St',
        city: 'Anytown',
        countryCode: 'US'
      }
    },
    selected: true
  }
]);
```

**Usage via CartForm:**
```tsx
<CartForm action={CartForm.ACTIONS.DeliveryAddressesReplace}>
  {/* form inputs */}
</CartForm>
```
