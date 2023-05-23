import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartQueryData,
  CartQueryOptions,
  CartQueryReturn,
} from './cart-types';

export function cartLinesRemoveDefault(
  options: CartQueryOptions,
): CartQueryReturn<string[]> {
  return async (lineIds, optionalParams) => {
    const {cartLinesRemove} = await options.storefront.mutate<{
      cartLinesRemove: CartQueryData;
    }>(CART_LINES_REMOVE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lineIds,
        ...optionalParams,
      },
    });
    return cartLinesRemove;
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesRemove
export const CART_LINES_REMOVE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation CartLinesRemove(
    $cartId: ID!
    $lineIds: [ID!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
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
