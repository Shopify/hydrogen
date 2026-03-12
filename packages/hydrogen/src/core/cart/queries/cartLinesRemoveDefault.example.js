import {cartLinesRemoveDefault} from '@shopify/hydrogen';

const cartRemove = cartLinesRemoveDefault({
  storefront,
  getCartId,
});

const result = await cartRemove(['gid://shopify/CartLine/123456789']);
