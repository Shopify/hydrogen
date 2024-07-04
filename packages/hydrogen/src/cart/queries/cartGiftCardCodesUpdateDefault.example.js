import {cartGiftCardCodesUpdateDefault} from '@shopify/hydrogen';

const cartGiftCardCodes = cartGiftCardCodesUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartGiftCardCodes(['FREE_SHIPPING']);
