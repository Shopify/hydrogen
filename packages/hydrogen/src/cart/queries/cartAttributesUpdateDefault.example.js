/* eslint-disable @typescript-eslint/no-unused-vars */
import {cartAttributesUpdateDefault} from '@shopify/hydrogen';

const cartAttributes = cartAttributesUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartAttributes([
  {
    key: 'Somekey',
    value: '1',
  },
]);
