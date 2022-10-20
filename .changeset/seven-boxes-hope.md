---
'@shopify/hydrogen-react': patch
---

Add `<CartProvider/>` and releated hooks & types.

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
