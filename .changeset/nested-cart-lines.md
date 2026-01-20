---
'@shopify/cli-hydrogen': patch
'skeleton': patch
---

Add support for nested cart line items (warranties, gift wrapping, etc.)

Storefront API 2025-10 introduces `parentRelationship` on cart line items, enabling parent-child relationships for add-ons. This update displays nested line items in the cart.

### Changes

- Updates GraphQL fragments to include `parentRelationship` and `lineComponents` fields
- Updates `CartMain` and `CartLineItem` to render child line items with visual hierarchy

### Note

This update focuses on **displaying** nested line items. To add both a product and its child (e.g., warranty) in a single action:

```tsx
<AddToCartButton
  lines={[
    {merchandiseId: 'gid://shopify/ProductVariant/laptop-456', quantity: 1},
    {
      merchandiseId: 'gid://shopify/ProductVariant/warranty-123',
      quantity: 1,
      parent: {merchandiseId: 'gid://shopify/ProductVariant/laptop-456'},
    },
  ]}
>
  Add to Cart with Warranty
</AddToCartButton>
```
