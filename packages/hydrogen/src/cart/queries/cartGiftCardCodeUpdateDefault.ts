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

export function cartGiftCardCodesUpdateDefault(
  options: CartQueryOptions,
): CartGiftCardCodesUpdateFunction {
  return async (giftCardCodes, optionalParams) => {
    // Ensure the gift card codes are unique
    const uniqueCodes = giftCardCodes.filter((value, index, array) => {
      return array.indexOf(value) === index;
    });

    const {cartGiftCardCodesUpdate, errors} = await options.storefront.mutate<{
      cartGiftCardCodesUpdate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_GIFT_CARD_CODE_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        giftCardCodes: uniqueCodes,
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
  ) @inContext(country: $country, language: $language) {
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
