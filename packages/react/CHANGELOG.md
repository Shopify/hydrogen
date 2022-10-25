# @shopify/hydrogen-react

## 2022.10.1

### Patch Changes

- 71b78b0: Initial release of version `2022-10`!

## 2022.7.1

### Patch Changes

- 702df8f: Fixed issue with TypeScript not being able to find the typings for `@shopify/hydrogen-react/storefront-api-types`
- b9c3940: Add `<CartProvider/>` and releated hooks & types.

  Component:

  - `<CartProvider/>`

  Hooks:

  - `useCart()`
  - `useCartFetch()`
  - `useInstantCheckout()`

  Types:

  - `CartState`
  - `CartStatus`
  - `Cart`
  - `CartWithActions`
  - `CartAction`

  Also updated `flattenConnection()` to better handle a `null` or `undefined` argument.
