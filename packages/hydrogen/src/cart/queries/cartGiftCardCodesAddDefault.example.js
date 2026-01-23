import {cartGiftCardCodesAddDefault} from '@shopify/hydrogen';

export async function action({context}) {
  const cartAddGiftCardCodes = cartGiftCardCodesAddDefault({
    storefront: context.storefront,
    getCartId: () => context.cart.getCartId(),
  });

  const result = await cartAddGiftCardCodes(['SUMMER2025', 'WELCOME10']);
  return result;
}
