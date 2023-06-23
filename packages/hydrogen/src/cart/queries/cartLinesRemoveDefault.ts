import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryOptions,
} from './cart-types';

export type CartLinesRemoveFunction = (
  lineIds: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

export function cartLinesRemoveDefault(
  options: CartQueryOptions,
): CartLinesRemoveFunction {
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
  mutation cartLinesRemove(
    $cartId: ID!
    $lineIds: [ID!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
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
