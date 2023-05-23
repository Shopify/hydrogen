import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartQueryData,
  CartQueryOptions,
  CartQueryReturn,
} from './cart-types';
import type {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';

export function cartLinesAddDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartLineInput[]> {
  return async (lines, optionalParams) => {
    const {cartLinesAdd} = await options.storefront.mutate<{
      cartLinesAdd: CartQueryData;
    }>(CART_LINES_ADD_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams,
      },
    });
    return cartLinesAdd;
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesAdd
export const CART_LINES_ADD_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation CartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
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
