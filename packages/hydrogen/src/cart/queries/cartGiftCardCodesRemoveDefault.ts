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

export type CartGiftCardCodesRemoveFunction = (
  appliedGiftCardIds: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
export function cartGiftCardCodesRemoveDefault(
  options: CartQueryOptions,
): CartGiftCardCodesRemoveFunction {
  return async (appliedGiftCardIds, optionalParams) => {
    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartGiftCardCodesRemove, errors} = await options.storefront.mutate<{
      cartGiftCardCodesRemove: CartQueryData;
      errors: StorefrontApiErrors;
    }>(
      CART_GIFT_CARD_CODES_REMOVE_MUTATION(options.cartFragment, {
        includeVisitorConsent,
      }),
      {
        variables: {
          cartId: options.getCartId(),
          appliedGiftCardIds,
          ...optionalParams,
        },
      },
    );
    return formatAPIResult(cartGiftCardCodesRemove, errors);
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartGiftCardCodesRemove
export const CART_GIFT_CARD_CODES_REMOVE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartGiftCardCodesRemove(
    $cartId: ID!
    $appliedGiftCardIds: [ID!]!
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
    cartGiftCardCodesRemove(cartId: $cartId, appliedGiftCardIds: $appliedGiftCardIds) {
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
