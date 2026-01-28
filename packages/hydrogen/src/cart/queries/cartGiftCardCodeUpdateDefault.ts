import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import {
  CART_WARNING_FRAGMENT,
  MINIMAL_CART_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryDataReturn,
  CartQueryOptions,
} from './cart-types';

export type CartGiftCardCodesUpdateFunction = (
  giftCardCodes: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/**
 * Updates (replaces) gift card codes in the cart.
 *
 * To add codes without replacing, use `cartGiftCardCodesAdd` (API 2025-10+).
 *
 * @param {CartQueryOptions} options - Cart query options including storefront client and cart fragment.
 * @returns {CartGiftCardCodesUpdateFunction} - Function accepting gift card codes array and optional parameters.
 *
 * @example Replace all gift card codes
 * const updateGiftCardCodes = cartGiftCardCodesUpdateDefault({ storefront, getCartId });
 * await updateGiftCardCodes(['SUMMER2025', 'WELCOME10']);
 */
export function cartGiftCardCodesUpdateDefault(
  options: CartQueryOptions,
): CartGiftCardCodesUpdateFunction {
  return async (giftCardCodes, optionalParams) => {
    const {cartGiftCardCodesUpdate, errors} = await options.storefront.mutate<{
      cartGiftCardCodesUpdate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_GIFT_CARD_CODE_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        giftCardCodes,
        ...optionalParams,
      },
    });
    return formatAPIResult(cartGiftCardCodesUpdate, errors);
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartGiftCardCodesUpdate
export const CART_GIFT_CARD_CODE_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartGiftCardCodesUpdate(
    $cartId: ID!
    $giftCardCodes: [String!]!
    $language: LanguageCode
    $country: CountryCode
    $visitorConsent: VisitorConsent
  ) @inContext(country: $country, language: $language, visitorConsent: $visitorConsent) {
    cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $giftCardCodes) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
      warnings {
        ...CartApiWarning
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
  ${CART_WARNING_FRAGMENT}
`;
