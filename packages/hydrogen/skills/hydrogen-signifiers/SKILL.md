---
name: hydrogen-signifiers
description: >
  Guide for standard signifiers in Hydrogen storefronts. Use when adding,
  checking, or debugging `data-h3` attributes on storefront controls, or when
  a storefront E2E check reports a missing or ambiguous signifier.
---

# Standard Signifiers

## What

A signifier is a stable attribute on a storefront control. It tells a test runner what the control is and what state it has.

- The `data-h3` attribute holds the signifier name.
- `data-h3-*` attributes hold the state.
- One element has one signifier. State narrows the match.

```html
<button data-h3="product-add-to-cart" data-h3-variant-id="gid://shopify/ProductVariant/1" data-h3-available="true">
  Add to cart
</button>
```

## Why

Labels, roles, and link paths change when copy or markup changes. Signifiers give the storefront E2E suite a stable target that the storefront owns. Signifiers are always present, also in production. They are not test-only attributes.

## Requirements

- The minimum `@shopify/hydrogen` version is not released yet. Check the changelog for the first release that adds signifiers.
- Import from the root entry point: `@shopify/hydrogen`.

## Rules

- Use `signifier(name, state)` to write attributes. Do not write `data-h3*` attributes by hand.
- Use `signifierSelector(name, partialState)` to find elements. Do not build selectors by hand.
- Give all required state fields. TypeScript tells you which fields are required.
- If a wrapper component renders the control, make sure the wrapper forwards props to the rendered element. A wrapper can drop props, and then the signifier is missing.
- Put one signifier on one element. Do not render two visible elements with the same signifier and state on one page.

## Entries

### `product-add-to-cart`

The add-to-cart submit control on a product page.

State: `{ variantId: string; available: boolean }`. Both fields are required.

#### With binding

`register('addToCart', {})` adds the attributes. This is true for the React and Vue bindings and for the core form store. The attributes change when the selected variant changes. Do not add `signifier()` to this element.

React:

```tsx
<button {...register('addToCart', {})}>Add to cart</button>
```

Vue:

```vue
<button v-bind="register('addToCart', {})">Add to cart</button>
```

When no variant is selected, the state is `variantId = ''` and `available = false`.

#### Without binding

If your storefront does not use the Hydrogen form bindings, spread the helper on your own control:

```tsx
import { signifier } from '@shopify/hydrogen';

<button type="submit" {...signifier('product-add-to-cart', { variantId, available })}>
  Add to cart
</button>
```

`signifier()` returns only the signifier attributes. It does not add form semantics, so set `type="submit"` and other form props yourself.

Use `''` for `variantId` and `false` for `available` when no variant is selected.

## Troubleshooting

- **Missing signifier**: Make sure the control uses `register('addToCart', {})` or `signifier('product-add-to-cart', ...)`. Then make sure each wrapper component forwards props to the rendered element. A wrapper can drop props.
- **Ambiguous signifier**: More than one visible element has the same signifier. Or no element is visible and more than one hidden element has the signifier. One visible element plus hidden copies is not ambiguous. Keep one control per signifier on the page, or remove the extra copy.
