---
"@shopify/hydrogen": patch
---

Fix `cartGetDefault` not respecting the `cartId` argument. The returned function accepts an optional `cartInput.cartId`, but the implementation called `getCartId()` unconditionally and then early-returned `null` when that was falsy — so a caller passing `{cartId: '…'}` with no cart cookie got `null` back. The resolved cart id now prefers `cartInput.cartId` before falling back to `getCartId()`, and the GraphQL `variables` spread order was swapped so the resolved cart id always wins over an explicit `{cartId: undefined}` in the input.
