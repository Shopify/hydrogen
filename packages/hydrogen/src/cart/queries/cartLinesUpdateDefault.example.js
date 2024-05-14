/* eslint-disable @typescript-eslint/no-unused-vars */
import {cartLinesUpdateDefault} from '@shopify/hydrogen';

const cartUpdate = cartLinesUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartUpdate([
  {
    id: 'gid://shopify/CartLine/123456789',
    quantity: 2,
  },
]);
