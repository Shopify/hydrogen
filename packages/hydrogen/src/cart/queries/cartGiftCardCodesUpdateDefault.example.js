import {cartGiftCardCodesUpdateDefault} from '@shopify/hydrogen';

const cartGiftCardCodes = cartGiftCardCodesUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartGiftCardCodes(['GIFT_CARD_CODE_123']);
