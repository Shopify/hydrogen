import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import {throwIfLinesAreOptimistic} from '../optimistic/optimistic-cart.helper';
import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryDataReturn,
  CartQueryOptions,
} from './cart-types';
import type {CartLineUpdateInput} from '@shopify/hydrogen-react/storefront-api-types';

export type CartLinesUpdateFunction = (
  lines: CartLineUpdateInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartLinesUpdateDefault(
  options: CartQueryOptions,
): CartLinesUpdateFunction {
  return async (lines, optionalParams) => {
    throwIfLinesAreOptimistic('updateLines', lines);

    const {cartLinesUpdate, errors} = await options.storefront.mutate<{
      cartLinesUpdate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_LINES_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams,
      },
    });
    return formatAPIResult(cartLinesUpdate, errors);
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
      userErrors {
        ...CartApiError
      }
    }
  }

  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
