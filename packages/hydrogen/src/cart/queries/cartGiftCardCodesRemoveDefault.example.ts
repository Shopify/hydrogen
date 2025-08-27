import {
  cartGiftCardCodesRemoveDefault,
  type HydrogenCart,
  type CartQueryOptions,
} from '@shopify/hydrogen';

export async function action({context}: {context: CartQueryOptions}) {
  const cartRemoveGiftCardCodes: HydrogenCart['removeGiftCardCodes'] =
    cartGiftCardCodesRemoveDefault({
      storefront: context.storefront,
      getCartId: context.getCartId,
    });

  const result = await cartRemoveGiftCardCodes([
    'GIFT_CARD_CODE_1',
    'GIFT_CARD_CODE_2',
  ]);
  return result;
}
