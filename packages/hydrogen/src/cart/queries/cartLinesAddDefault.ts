import type {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';
import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
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
import {
  getInContextVariables,
  getInContextDirective,
  CartBuilderOptions,
  shouldIncludeVisitorConsent,
} from './cart-query-helpers';

export type CartLinesAddFunction = (
  lines: Array<CartLineInput>,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartLinesAddDefault(
  options: CartQueryOptions,
): CartLinesAddFunction {
  return async (lines, optionalParams) => {
    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartLinesAdd, errors} = await options.storefront.mutate<{
      cartLinesAdd: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_LINES_ADD_MUTATION(options.cartFragment, {includeVisitorConsent}), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams,
      },
    });

    return formatAPIResult(cartLinesAdd, errors);
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesAdd
export const CART_LINES_ADD_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
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
