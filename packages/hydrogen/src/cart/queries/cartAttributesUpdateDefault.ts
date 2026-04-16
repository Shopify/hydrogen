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
import type {AttributeInput} from '@shopify/hydrogen-react/storefront-api-types';
import {
  getInContextVariables,
  getInContextDirective,
  CartBuilderOptions,
  shouldIncludeVisitorConsent,
} from './cart-query-helpers';

export type CartAttributesUpdateFunction = (
  attributes: AttributeInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
export function cartAttributesUpdateDefault(
  options: CartQueryOptions,
): CartAttributesUpdateFunction {
  return async (attributes, optionalParams) => {
    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartAttributesUpdate, errors} = await options.storefront.mutate<{
      cartAttributesUpdate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(
      CART_ATTRIBUTES_UPDATE_MUTATION(options.cartFragment, {
        includeVisitorConsent,
      }),
      {
        variables: {
          cartId: optionalParams?.cartId || options.getCartId(),
          attributes,
          ...optionalParams,
        },
      },
    );
    return formatAPIResult(cartAttributesUpdate, errors);
  };
}

export const CART_ATTRIBUTES_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartAttributesUpdate(
    $cartId: ID!
    $attributes: [AttributeInput!]!
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
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
