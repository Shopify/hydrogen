/* eslint-disable @typescript-eslint/no-unused-vars */
import {cartCreateDefault} from '@shopify/hydrogen';

const cartCreate = cartCreateDefault({
  storefront,
  getCartId,
});

const result = await cartCreate({
  lines: [
    {
      merchandiseId: 'gid://shopify/ProductVariant/123456789',
      quantity: 1,
    },
  ],
});
