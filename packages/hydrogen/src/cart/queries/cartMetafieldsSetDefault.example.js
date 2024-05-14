/* eslint-disable @typescript-eslint/no-unused-vars */
import {cartMetafieldsSetDefault} from '@shopify/hydrogen';

const cartSetMetafields = cartMetafieldsSetDefault({
  storefront,
  getCartId,
});

const result = await cartSetMetafields([
  {
    key: 'custom.gift',
    type: 'boolean',
    value: 'true',
  },
]);
