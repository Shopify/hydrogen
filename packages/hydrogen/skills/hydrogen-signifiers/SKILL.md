---
name: hydrogen-signifiers
description: >
  Guide for standard signifiers in Hydrogen storefronts. Use when adding,
  checking, or debugging `data-shopify-testid` attributes on storefront controls, or when
  a storefront E2E check reports a missing or not-visible signifier.
---

# Standard Signifiers

## What

A signifier is a stable attribute on a storefront control. It tells a test runner what the control is and what state it has.

- The `data-shopify-testid` attribute holds the signifier name. Ordinary `data-testid` attributes are separate.
- State attributes use the `data-shopify-` namespace, not `data-shopify-testid-`.
- One element has one signifier. State narrows the match.

```html
<button data-shopify-testid="product-add-to-cart" data-shopify-variant-id="gid://shopify/ProductVariant/1" data-shopify-available-for-sale="true">
  Add to cart
</button>
```

## Why

Labels, roles, and link paths change when copy or markup changes. Signifiers give the storefront E2E suite a stable target that the storefront owns. Signifiers are always present, also in production. They are not test-only attributes.

## Requirements

- Check the `@shopify/hydrogen` changelog for the first release that adds signifiers.
- Import from the root entry point: `@shopify/hydrogen`.

## Rules

- Use `signifier(testId, state)` to write signifier attributes. Do not write them by hand.
- Use `signifierSelector(testId, partialState)` to find elements. Do not build selectors by hand.
- Give all required state fields. TypeScript tells you which fields are required.
- If a wrapper component renders the control, make sure the wrapper forwards props to the rendered element. A wrapper can drop props, and then the signifier is missing.
- Put one signifier on one element. More than one visible element can match the state that a test supplies, for example a main and a sticky add-to-cart button. The test acts on the first visible match in DOM order. It does not test each copy, so make sure each copy works.
- A test acts only on a visible match. It does not use a hidden copy. If the control appears only after a step, such as opening a drawer, the test must do that step first.

## Entries

### `product-add-to-cart`

The add-to-cart submit control on a product page.

State: `{ variantId: string; availableForSale: boolean }`. Both fields are required.

#### With binding

`register('addToCart', {})` adds the attributes. The React and Vue bindings give a register function for the current state, so the attributes change when the selected variant changes. If you use the core `createProductFormRegister` directly, create it again after each state change. Do not add `signifier()` to this element.

React:

```tsx
<button {...register('addToCart', {})}>Add to cart</button>
```

Vue (`form` is the object that `useProductForm` returns):

```vue
<button v-bind="form.register('addToCart', {})">Add to cart</button>
```

Do not destructure `register` one time during setup. The destructured function keeps the state from that time.

When no variant is selected, the state is `variantId = ''` and `availableForSale = false`.

#### Without binding

If your storefront does not use the Hydrogen form bindings, spread the helper on your own control:

```tsx
import { signifier } from '@shopify/hydrogen';

<button type="submit" {...signifier('product-add-to-cart', { variantId, availableForSale })}>
  Add to cart
</button>
```

`signifier()` returns only the signifier attributes. It does not add form semantics, so set `type="submit"` and other form props yourself.

Use `''` for `variantId` and `false` for `availableForSale` when no variant is selected.

## Troubleshooting

- **Missing signifier**: Make sure the control uses `register('addToCart', {})` or `signifier('product-add-to-cart', ...)`. Then make sure each wrapper component forwards props to the rendered element. A wrapper can drop props. The attributes can exist but not match the requested state, for example `availableForSale: false` when the test asks for `availableForSale: true`, so check the selected variant state, not only the markup.
- **Signifier not visible**: One or more elements match the signifier and the supplied state, but none is visible before the timeout. The error reports the attached and visible counts. Make sure a matching control is visible on the page. If the control is inside a closed drawer or a collapsed section, open it first. A hidden native control needs a separate test strategy.
- **Wrong control used**: When more than one visible element matches, the test acts on the first one in DOM order. Elements with different state can all match a partial state. Narrow the search scope or supply the relevant state fields to target the intended control.
