---
"@shopify/hydrogen": patch
---

Fix `cartGetDefault` ignoring the `cartId` argument. Previously, when callers invoked the returned function with `{cartId: '...'}`, that value was ignored and the function called `getCartId()` instead — which could return `undefined` and cause an early `return null`, even though the caller had provided a valid cart id. The resolved cart id now prefers `cartInput.cartId` before falling back to `getCartId()`.
