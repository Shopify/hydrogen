import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import {throwIfLinesAreOptimistic} from '../optimistic/optimistic-cart.helper';
import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryDataReturn,
  CartQueryOptions,
} from './cart-types';

export type CartLinesRemoveFunction = (
  lineIds: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartLinesRemoveDefault(
  options: CartQueryOptions,
): CartLinesRemoveFunction {
  return async (lineIds, optionalParams) => {
    throwIfLinesAreOptimistic('removeLines', lineIds);

    const {cartLinesRemove, errors} = await options.storefront.mutate<{
      cartLinesRemove: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_LINES_REMOVE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lineIds,
        ...optionalParams,
      },
    });
    return formatAPIResult(cartLinesRemove, errors);
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
      userErrors {
        ...CartApiError
      }
    }
  }

  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
