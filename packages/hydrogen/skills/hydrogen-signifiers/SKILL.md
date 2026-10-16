---
name: hydrogen-signifiers
description: >
  Guide for standard signifiers in Hydrogen storefronts. Use when adding,
  checking, or debugging `data-shopify-testid` attributes on storefront controls, or when
  a storefront E2E check reports a missing or ambiguous signifier.
---

# Standard Signifiers

## What

A signifier is a stable attribute on a storefront control. It tells a test runner what the control is and what state it has.

- The `data-shopify-testid` attribute holds the signifier name. Ordinary `data-testid` attributes are separate.
- State attributes use the `data-shopify-` namespace, not `data-shopify-testid-`.
- One element has one signifier. State narrows the match.

```html
<button data-shopify-testid="product-add-to-cart" data-shopify-variant-id="gid://shopify/ProductVariant/1" data-shopify-available="true">
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
- Put one signifier on one element. In the scope that a test searches, do not render two visible elements that match the state the test supplies. Hidden copies are allowed. For example, two visible available buttons with different variant IDs both match `{ available: true }`.

## Entries

### `product-add-to-cart`

The add-to-cart submit control on a product page.

State: `{ variantId: string; available: boolean }`. Both fields are required.

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

### `product-option-value`

State: `{ optionName: string; optionValue: string; selected: boolean }`. All fields are required.

Spread `register('optionValue', { optionName, value })` on buttons or inputs. Keep native checked state or `aria-pressed` for buttons. For **all** option links, including hydrated same-product and combined-listing links, use the pure getter instead:

```tsx
import { getProductOptionValueAttributes } from '@shopify/hydrogen';

<a href={url} {...getProductOptionValueAttributes(option.name, value)}
  aria-current={value.selected ? 'true' : undefined}>{value.name}</a>
```

The getter returns only signifier attributes. Keep the URL, `aria-current`, and guarded same-product selection handler on the link. Never spread registration props onto a link; call the registered handler only inside the native guarded click hook or the framework's equivalent. Without bindings, buttons or inputs can use `signifier('product-option-value', { optionName, optionValue, selected })`.

React and Vue bindings track unresolved selections. Core callers must pass `state.selectedOptions` from `store.getState()` as the optional third argument to `createProductFormRegister` for unresolved selections, and recreate the register function after state changes. The two-argument call still works, but falls back to the selected variant's options or an empty selection. Duplicate option names use the last value.

The portable contract supports links, buttons, radios, and checkboxes. Select pickers are not supported. Keep links for no-JavaScript selection. Do not hide the only activatable control with `display: none`; clipped, focusable controls can use native keyboard activation.

### `product-quantity`

State: `{}`. Spread `register('quantity', { value })` or `register('quantity', { defaultValue })` on the visible, buyer-editable quantity input. Without bindings, use `signifier('product-quantity', {})`. A hidden quantity field is not a valid target. A stepper must forward the attributes to its input, not its wrapper or increment button. The native value is the quantity source; there is no quantity state attribute.

### `cart-line`

The container for one cart line. State: `{ merchandiseId: string; quantity: number; pending: boolean }`. Use the product variant ID as `merchandiseId`, not the cart line ID.

- With React/Vue cart bindings, spread `lineProps(line)` from `useCartForm()` on the container. It follows live pending state.
- With the core cart store, spread `getCartLineAttributes(line, cartState)` from `@shopify/hydrogen` on the container after each update. The line needs `id`, `quantity`, and `merchandise: { id }`. Missing merchandise metadata produces an empty merchandise ID. The getter adds `aria-busy="true"` only while that line is pending.
- Without the cart store, spread `signifier('cart-line', { merchandiseId, quantity, pending })` and manage pending accessibility yourself.

### Cart line controls

Each control takes `{}` state. Cart form registers add these attributes automatically, including all quantity overloads.

| Signifier | Register |
| --- | --- |
| `cart-line-quantity` | `register('quantity', { value: line.quantity })` |
| `cart-line-increase` | `register('increase')` |
| `cart-line-decrease` | `register('decrease')` |
| `cart-line-remove` | `register('remove')` |

Without bindings, put `signifier(controlName, {})` on the native quantity input or matching action control. Keep all four controls inside their `cart-line` container, including a remove control in a separate form. Forward attributes through wrappers. Keep accessible labels, native form behavior, inline errors, and pending visuals. `pending=false` alone does not prove mutation success. See [hydrogen-cart-ui](../hydrogen-cart-ui/SKILL.md) for line forms and pending/error handling.

### `product-card`

The product card root. State: `{ productHandle: string }`. Use the product handle, not its ID.

```tsx
import { getProductCardAttributes } from '@shopify/hydrogen';

<article {...getProductCardAttributes(product)}>
  <a href={`/products/${product.handle}`}>{product.title}</a>
</article>
```

Keep the native product link. If the card root is already a link, put the attributes on that link without adding a wrapper. The getter returns only signifier attributes, not an `href` or click handler.

### `collection-filter-value`

The actual checkbox for one Storefront API filter value, not its wrapping label. State: `{ filterId: string }`. `filterId` is the **value** `id`, not the parent filter `id`.

```tsx
import { getFilterValueAttributes } from '@shopify/hydrogen';

<label>
  <input
    {...getFilterValueAttributes(value)}
    type="checkbox"
    name={name}
    value={paramValue}
    checked={isActive}
    onChange={onChange}
  />
  {value.label}
</label>
```

Pass the full API value to the getter so TypeScript can reject a parent filter. The caller keeps the native checked state, form fields, handlers, disabled state, and accessible label. Do not copy checked state into a signifier attribute.

Both getters are also re-exported from `@shopify/hydrogen/react` and `@shopify/hydrogen/vue`. They do not require a provider or state hook. In Vue, use `v-bind="getFilterValueAttributes(value)"` or `v-bind="getProductCardAttributes(product)"` on the rendered element.

Without the getters, use `signifier('product-card', { productHandle: product.handle })` or `signifier('collection-filter-value', { filterId: value.id })`. Do not add a second signifier to the same element.

## Troubleshooting

- **Missing signifier**: Make sure the control uses `register('addToCart', {})` or `signifier('product-add-to-cart', ...)`. Then make sure each wrapper component forwards props to the rendered element. A wrapper can drop props. The attributes can exist but not match the requested state, for example `available: false` when the test asks for `available: true`, so check the selected variant state, not only the markup.
- **Ambiguous signifier**: In the searched scope, more than one visible element matches the signifier and the supplied state. Or no element is visible and more than one hidden element matches. One visible match plus hidden copies is not ambiguous. Elements with different state can all match a partial state. Keep one visible matching control in the scope, or remove the extra copy.
- **Missing cart line control**: Check that the native control is inside its `cart-line` container and receives the registered attributes. A signifier outside that container cannot identify a control for that line.
