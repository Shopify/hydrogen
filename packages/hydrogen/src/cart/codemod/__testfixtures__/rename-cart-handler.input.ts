// @ts-nocheck - This is a codemod test fixture, not meant to type-check
import {createCartHandler, type HydrogenCart} from '@shopify/hydrogen';

const cart = createCartHandler({
  storefront,
  getCartId,
  setCartId,
  cartQueryFragment: MY_QUERY,
  cartMutateFragment: MY_MUTATE,
});
