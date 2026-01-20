---
'@shopify/hydrogen-react': patch
---

Add `parent` prop to `AddToCartButton` for nested cart lines

The `AddToCartButton` component now accepts an optional `parent` prop, allowing you to add items as children of an existing cart line. This enables adding warranties, gift wrapping, or other add-ons that should be associated with a parent product.

### Usage

```tsx
import {AddToCartButton} from '@shopify/hydrogen-react';

// Add a warranty as a child of an existing cart line (by line ID)
<AddToCartButton
  variantId="gid://shopify/ProductVariant/warranty-123"
  parent={{parentLineId: 'gid://shopify/CartLine/parent-456'}}
>
  Add Extended Warranty
</AddToCartButton>

// Add a warranty as a child of a cart line (by merchandise ID)
// Useful when you know the product variant but not the cart line ID
<AddToCartButton
  variantId="gid://shopify/ProductVariant/warranty-123"
  parent={{merchandiseId: 'gid://shopify/ProductVariant/laptop-456'}}
>
  Add Extended Warranty
</AddToCartButton>
```

### Type

```ts
interface AddToCartButtonPropsBase {
  // ... existing props
  /** The parent line item of the item being added to the cart. Used for nested cart lines. */
  parent?: CartLineParentInput;
}
```
