import {cartDiscountCodesUpdateDefault} from '@shopify/hydrogen';

const cartDiscount = cartDiscountCodesUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartDiscount(['FREE_SHIPPING']);
