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
} from './cart-query-helpers';

export type CartNoteUpdateFunction = (
  note: string,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartNoteUpdateDefault(
  options: CartQueryOptions,
): CartNoteUpdateFunction {
  return async (note, optionalParams) => {
    const includeVisitorConsent = optionalParams?.visitorConsent !== undefined;
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

type CartMutationBuilderOptions = {
  includeVisitorConsent?: boolean;
};

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartNoteUpdate
export const CART_NOTE_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartMutationBuilderOptions = {},
) => `#graphql
  mutation cartNoteUpdate(
    $cartId: ID!
    $note: String!
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  ) ${getInContextDirective(options.includeVisitorConsent ?? false)} {
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
