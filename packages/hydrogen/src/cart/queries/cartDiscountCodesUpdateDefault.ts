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

export type CartDiscountCodesUpdateFunction = (
  discountCodes: string[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
export function cartDiscountCodesUpdateDefault(
  options: CartQueryOptions,
): CartDiscountCodesUpdateFunction {
  return async (discountCodes, optionalParams) => {
    // Ensure the discount codes are unique
    const uniqueCodes = discountCodes.filter((value, index, array) => {
      return array.indexOf(value) === index;
    });

    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartDiscountCodesUpdate, errors} = await options.storefront.mutate<{
      cartDiscountCodesUpdate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(
      CART_DISCOUNT_CODE_UPDATE_MUTATION(options.cartFragment, {
        includeVisitorConsent,
      }),
      {
        variables: {
          cartId: options.getCartId(),
          discountCodes: uniqueCodes,
          ...optionalParams,
        },
      },
    );
    return formatAPIResult(cartDiscountCodesUpdate, errors);
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartDiscountCodesUpdate
export const CART_DISCOUNT_CODE_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]!
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      ... @defer {
        cart {
          ...CartApiMutation
        }
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
