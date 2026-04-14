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
} from './cart-query-helpers';

export type CartAttributesUpdateFunction = (
  attributes: AttributeInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartAttributesUpdateDefault(
  options: CartQueryOptions,
): CartAttributesUpdateFunction {
  return async (attributes, optionalParams) => {
    const includeVisitorConsent = optionalParams?.visitorConsent !== undefined;
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

type CartMutationBuilderOptions = {
  includeVisitorConsent?: boolean;
};

export const CART_ATTRIBUTES_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartMutationBuilderOptions = {},
) => `#graphql
  mutation cartAttributesUpdate(
    $cartId: ID!
    $attributes: [AttributeInput!]!
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  ) ${getInContextDirective(options.includeVisitorConsent ?? false)} {
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
