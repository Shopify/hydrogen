import {cartGiftCardCodesRemoveDefault} from '@shopify/hydrogen';

export async function action({context}) {
  const cartRemoveGiftCardCodes = cartGiftCardCodesRemoveDefault({
    storefront: context.storefront,
    getCartId: () => context.cart.getCartId(),
  });

  const result = await cartRemoveGiftCardCodes([
    'GIFT_CARD_CODE_1',
    'GIFT_CARD_CODE_2',
  ]);
  return result;
}
