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
import {
  getInContextVariables,
  getInContextDirective,
} from './cart-query-helpers';

export type CartLinesRemoveFunction = (
  lineIds: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartLinesRemoveDefault(
  options: CartQueryOptions,
): CartLinesRemoveFunction {
  return async (lineIds, optionalParams) => {
    throwIfLinesAreOptimistic('removeLines', lineIds);

    const includeVisitorConsent = optionalParams?.visitorConsent !== undefined;
    const {cartLinesRemove, errors} = await options.storefront.mutate<{
      cartLinesRemove: CartQueryData;
      errors: StorefrontApiErrors;
    }>(
      CART_LINES_REMOVE_MUTATION(options.cartFragment, {includeVisitorConsent}),
      {
        variables: {
          cartId: options.getCartId(),
          lineIds,
          ...optionalParams,
        },
      },
    );
    return formatAPIResult(cartLinesRemove, errors);
  };
}

type CartMutationBuilderOptions = {
  includeVisitorConsent?: boolean;
};

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartLinesRemove
export const CART_LINES_REMOVE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartMutationBuilderOptions = {},
) => `#graphql
  mutation cartLinesRemove(
    $cartId: ID!
    $lineIds: [ID!]!
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  ) ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
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
