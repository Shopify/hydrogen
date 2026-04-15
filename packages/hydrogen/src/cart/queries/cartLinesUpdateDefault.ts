import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import {throwIfLinesAreOptimistic} from '../optimistic/optimistic-cart.helper';
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
import type {CartLineUpdateInput} from '@shopify/hydrogen-react/storefront-api-types';
import {
  getInContextVariables,
  getInContextDirective,
  CartBuilderOptions,
  shouldIncludeVisitorConsent,
} from './cart-query-helpers';

export type CartLinesUpdateFunction = (
  lines: CartLineUpdateInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartLinesUpdateDefault(
  options: CartQueryOptions,
): CartLinesUpdateFunction {
  return async (lines, optionalParams) => {
    throwIfLinesAreOptimistic('updateLines', lines);

    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartLinesUpdate, errors} = await options.storefront.mutate<{
      cartLinesUpdate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(
      CART_LINES_UPDATE_MUTATION(options.cartFragment, {includeVisitorConsent}),
      {
        variables: {
          cartId: options.getCartId(),
          lines,
          ...optionalParams,
        },
      },
    );
    return formatAPIResult(cartLinesUpdate, errors);
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesUpdate
export const CART_LINES_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartLinesUpdate(
    $cartId: ID!
    $lines: [CartLineUpdateInput!]!
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
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
