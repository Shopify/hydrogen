---
'@shopify/hydrogen': patch
---

Fix a bug where `cart` could be null, even though a new cart was created by adding a line item.

This allows calling the cart `.get()` method right after creating a new cart with
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
  // .get() now returns the cart as expected
  const cart = await cartHandler.get();
  ```
