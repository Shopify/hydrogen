import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartQueryData,
  CartQueryOptions,
  CartQueryReturn,
} from './cart-types';
import type {CartSelectedDeliveryOptionInput} from '@shopify/hydrogen-react/storefront-api-types';

export function cartSelectedDeliveryOptionsUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartSelectedDeliveryOptionInput> {
  return async (selectedDeliveryOptions, optionalParams) => {
    const {cartSelectedDeliveryOptionsUpdate} =
      await options.storefront.mutate<{
        cartSelectedDeliveryOptionsUpdate: CartQueryData;
      }>(CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION(options.cartFragment), {
        variables: {
          cartId: options.getCartId(),
          selectedDeliveryOptions,
          ...optionalParams,
        },
      });
    return cartSelectedDeliveryOptionsUpdate;
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartSelectedDeliveryOptionsUpdate
export const CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartSelectedDeliveryOptionsUpdate(
    $cartId: ID!
    $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
