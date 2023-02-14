---
'@shopify/hydrogen-react': patch
---

Adding `<CartLineQuantity />` and `<CartLineQuantityAdjustButton />`

The `<CartLineQuantity />` and `<CartLineQuantityAdjustButton />` components have been added / migrated over from Hydrogen v1.

Additionally, fixed a bug when using `<CartLineQuantityAdjustButton />` that caused CartLine Attributes to be erased. CartLine Attributes should now be persisted when using that component.

## `useCartLine()` TypeScript types update

`useCartLine()`'s TypeScript type originally returned a `CartLine`. It has now been updated to be `PartialDeep<CartLine>`, which makes all the properties optional instead of required. This matches with the rest of hydrogen-react in that we can't know or guarnatee what properties exist on certain objects so we reflect that state in the TypeScript types.
