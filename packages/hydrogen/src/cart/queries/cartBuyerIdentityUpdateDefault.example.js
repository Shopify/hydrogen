import {cartBuyerIdentityUpdateDefault} from '@shopify/hydrogen';

const cartBuyerIdentity = cartBuyerIdentityUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartBuyerIdentity({
  customerAccessToken: '123',
});
