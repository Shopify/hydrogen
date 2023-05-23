import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartQueryData,
  CartQueryOptions,
  CartQueryReturn,
} from './cart-types';

export function cartDiscountCodesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<string[]> {
  return async (discountCodes, optionalParams) => {
    const {cartDiscountCodesUpdate} = await options.storefront.mutate<{
      cartDiscountCodesUpdate: CartQueryData;
    }>(CART_DISCOUNT_CODE_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        discountCodes,
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
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
