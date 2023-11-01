import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  ApiErrors,
  CartOptionalInput,
  CartQueryData,
  CartQueryOptions,
  StorefrontApiErrors,
} from './cart-types';
import type {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';

export type CartLinesAddFunction = (
  lines: CartLineInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData & ApiErrors>;

export function cartLinesAddDefault(
  options: CartQueryOptions,
): CartLinesAddFunction {
  return async (lines, optionalParams) => {
    const {cartLinesAdd, errors} = await options.storefront.mutate<{
      cartLinesAdd: CartQueryData;
      errors?: StorefrontApiErrors;
    }>(CART_LINES_ADD_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams,
      },
    });

    return {
      ...cartLinesAdd,
      apiErrors: errors,
    };
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesAdd
export const CART_LINES_ADD_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
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
