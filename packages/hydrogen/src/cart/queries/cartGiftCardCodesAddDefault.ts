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

/** @publicDocs */
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
