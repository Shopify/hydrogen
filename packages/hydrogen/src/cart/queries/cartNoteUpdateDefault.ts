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

export type CartNoteUpdateFunction = (
  note: string,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
export function cartNoteUpdateDefault(
  options: CartQueryOptions,
): CartNoteUpdateFunction {
  return async (note, optionalParams) => {
    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartNoteUpdate, errors} = await options.storefront.mutate<{
      cartNoteUpdate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(
      CART_NOTE_UPDATE_MUTATION(options.cartFragment, {includeVisitorConsent}),
      {
        variables: {
          cartId: options.getCartId(),
          note,
          ...optionalParams,
        },
      },
    );
    return formatAPIResult(cartNoteUpdate, errors);
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartNoteUpdate
export const CART_NOTE_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartNoteUpdate(
    $cartId: ID!
    $note: String!
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
    cartNoteUpdate(cartId: $cartId, note: $note) {
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
