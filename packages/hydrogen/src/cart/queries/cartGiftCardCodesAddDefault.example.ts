import {
  cartGiftCardCodesAddDefault,
  type HydrogenCart,
  type CartQueryOptions,
} from '@shopify/hydrogen';

export async function action({context}: {context: CartQueryOptions}) {
  const cartAddGiftCardCodes: HydrogenCart['addGiftCardCodes'] =
    cartGiftCardCodesAddDefault({
      storefront: context.storefront,
      getCartId: context.getCartId,
    });

  const result = await cartAddGiftCardCodes(['SUMMER2025', 'WELCOME10']);
  return result;
}
