// @ts-nocheck - This is a codemod test fixture, not meant to type-check
import {createHydrogenCart, type HydrogenCart} from '@shopify/hydrogen';

const cart = createHydrogenCart({
  storefront,
  getCartId,
  setCartId,
  cartQueryFragment: MY_QUERY,
  cartMutateFragment: MY_MUTATE,
});
