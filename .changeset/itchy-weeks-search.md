---
'@shopify/hydrogen': patch
---

Allow calling the cart `.get()` method right after creating a new cart with
one of the mutation methods: `create()`, `addLines()`, `updateDiscountCodes()`, `updateBuyerIdentity()`, `updateNote()`, `updateAttributes()`, `setMetafields()`.

```ts
import {
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
} from '@shopify/hydrogen';

const cartHandler = createCartHandler({
  storefront,
  getCartId: cartGetIdDefault(request.headers),
  setCartId: cartSetIdDefault(),
  cartQueryFragment: CART_QUERY_FRAGMENT,
  cartMutateFragment: CART_MUTATE_FRAGMENT,
});

await cartHandler.addLines([{merchandiseId: '...'}]);
// This change fixes a bug where `cart` would be null, even though a
// new cart was created when adding a line item
const cart = await cartHandler.get();
```
