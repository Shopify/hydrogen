import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartQueryData,
  CartQueryOptions,
  CartOptionalInput,
} from './cart-types';
import type {CartInput} from '@shopify/hydrogen-react/storefront-api-types';

export type CartCreateFunction = (
  input: CartInput,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

export function cartCreateDefault(
  options: CartQueryOptions,
): CartCreateFunction {
  return async (input, optionalParams) => {
    const {cartId, ...restOfOptionalParams} = optionalParams || {};
    const {cartCreate} = await options.storefront.mutate<{
      cartCreate: CartQueryData;
    }>(CART_CREATE_MUTATION(options.cartFragment), {
      variables: {
        input,
        ...restOfOptionalParams,
      },
    });
    return cartCreate;
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate
export const CART_CREATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartCreate(
    $input: CartInput!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...CartApiMutation
        checkoutUrl
      }
      errors: userErrors {
        ...CartApiError
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
