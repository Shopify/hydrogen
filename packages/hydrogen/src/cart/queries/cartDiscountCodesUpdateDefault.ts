import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryOptions,
  CartQueryReturn,
} from './cart-types';

export type CartDiscountCodesUpdateFunction = (
  discountCodes: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

export function cartDiscountCodesUpdateDefault(
  options: CartQueryOptions,
): CartDiscountCodesUpdateFunction {
  return async (discountCodes, optionalParams) => {
    // Ensure the discount codes are unique
    const uniqueCodes = discountCodes.filter((value, index, array) => {
      return array.indexOf(value) === index;
    });

    const {cartDiscountCodesUpdate} = await options.storefront.mutate<{
      cartDiscountCodesUpdate: CartQueryData;
    }>(CART_DISCOUNT_CODE_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        discountCodes: uniqueCodes,
        ...optionalParams,
      },
    });
    return cartDiscountCodesUpdate;
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartDiscountCodesUpdate
export const CART_DISCOUNT_CODE_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartApiMutation
      }
      errors: userErrors {
        ...CartApiError
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
