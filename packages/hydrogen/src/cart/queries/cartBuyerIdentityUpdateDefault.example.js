/* eslint-disable @typescript-eslint/no-unused-vars */
import {cartBuyerIdentityUpdateDefault} from '@shopify/hydrogen';

const cartBuyerIdentity = cartBuyerIdentityUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartBuyerIdentity({
  customerAccessToken: '123',
});
