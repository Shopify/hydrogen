import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryDataReturn,
  CartQueryOptions,
} from './cart-types';
import type {AttributeInput} from '@shopify/hydrogen-react/storefront-api-types';

export type CartAttributesUpdateFunction = (
  attributes: AttributeInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartAttributesUpdateDefault(
  options: CartQueryOptions,
): CartAttributesUpdateFunction {
  return async (attributes, optionalParams) => {
    const {cartAttributesUpdate, errors} = await options.storefront.mutate<{
      cartAttributesUpdate: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_ATTRIBUTES_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: optionalParams?.cartId || options.getCartId(),
        attributes,
      },
    });
    return formatAPIResult(cartAttributesUpdate, errors);
  };
}

export const CART_ATTRIBUTES_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartAttributesUpdate(
    $cartId: ID!
    $attributes: [AttributeInput!]!
  ) {
    cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
      cart {
        ...CartApiMutation
      }
      userErrors {
        ...CartApiError
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
