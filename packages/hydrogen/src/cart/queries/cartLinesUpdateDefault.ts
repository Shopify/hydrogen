import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryOptions,
} from './cart-types';
import type {CartLineUpdateInput} from '@shopify/hydrogen-react/storefront-api-types';

export type CartLinesUpdateFunction = (
  lines: CartLineUpdateInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

export function cartLinesUpdateDefault(
  options: CartQueryOptions,
): CartLinesUpdateFunction {
  return async (lines, optionalParams) => {
    const {cartLinesUpdate} = await options.storefront.mutate<{
      cartLinesUpdate: CartQueryData;
    }>(CART_LINES_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams,
      },
    });
    return cartLinesUpdate;
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesUpdate
export const CART_LINES_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartLinesUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
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
