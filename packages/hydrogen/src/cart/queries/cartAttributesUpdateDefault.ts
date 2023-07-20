import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryOptions,
} from './cart-types';
import type {AttributeInput} from '@shopify/hydrogen-react/storefront-api-types';

export type CartAttributesUpdateFunction = (
  attributes: AttributeInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

export function cartAttributesUpdateDefault(
  options: CartQueryOptions,
): CartAttributesUpdateFunction {
  return async (attributes, optionalParams) => {
    const {cartAttributesUpdate} = await options.storefront.mutate<{
      cartAttributesUpdate: CartQueryData;
    }>(CART_ATTRIBUTES_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: optionalParams?.cartId || options.getCartId(),
        attributes,
      },
    });
    return cartAttributesUpdate;
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
      errors: userErrors {
        ...CartApiError
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
