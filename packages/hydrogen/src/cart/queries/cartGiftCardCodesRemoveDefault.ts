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

export type CartGiftCardCodesRemoveFunction = (
  appliedGiftCardIds: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartGiftCardCodesRemoveDefault(
  options: CartQueryOptions,
): CartGiftCardCodesRemoveFunction {
  return async (appliedGiftCardIds, optionalParams) => {
    const includeVisitorConsent = optionalParams?.visitorConsent !== undefined;
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

type CartMutationBuilderOptions = {
  includeVisitorConsent?: boolean;
};

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartGiftCardCodesRemove
export const CART_GIFT_CARD_CODES_REMOVE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartMutationBuilderOptions = {},
) => `#graphql
  mutation cartGiftCardCodesRemove(
    $cartId: ID!
    $appliedGiftCardIds: [ID!]!
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  ) ${getInContextDirective(options.includeVisitorConsent ?? false)} {
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
