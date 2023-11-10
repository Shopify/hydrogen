import {cartGetDefault} from '@shopify/hydrogen';

const cartGet = cartGetDefault({
  storefront,
  getCartId,
});

const result = await cartGet();
