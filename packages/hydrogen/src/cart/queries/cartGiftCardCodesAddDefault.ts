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

export type CartGiftCardCodesAddFunction = (
  giftCardCodes: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/**
 * Adds gift card codes to the cart without replacing existing ones.
 *
 * This function sends a mutation to the Storefront API to add one or more gift card codes to the cart.
 * Unlike `cartGiftCardCodesUpdate` which replaces all codes, this mutation appends new codes to existing ones.
 *
 * @param {CartQueryOptions} options - The options for the cart query, including the storefront API client and cart fragment.
 * @returns {CartGiftCardCodesAddFunction} - A function that takes an array of gift card codes and optional parameters, and returns the result of the API call.
 *
 * @example Add gift card codes
 * const addGiftCardCodes = cartGiftCardCodesAddDefault({ storefront, getCartId });
 * await addGiftCardCodes(['SUMMER2025', 'WELCOME10']);
 */
export function cartGiftCardCodesAddDefault(
  options: CartQueryOptions,
): CartGiftCardCodesAddFunction {
  return async (giftCardCodes, optionalParams) => {
    const {cartGiftCardCodesAdd, errors} = await options.storefront.mutate<{
      cartGiftCardCodesAdd: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_GIFT_CARD_CODES_ADD_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        giftCardCodes,
        ...optionalParams,
      },
    });
    return formatAPIResult(cartGiftCardCodesAdd, errors);
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartGiftCardCodesAdd
export const CART_GIFT_CARD_CODES_ADD_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartGiftCardCodesAdd(
    $cartId: ID!
    $giftCardCodes: [String!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartGiftCardCodesAdd(cartId: $cartId, giftCardCodes: $giftCardCodes) {
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
