import {StorefrontApiErrors} from '../../storefront';
import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryDataReturn,
  CartQueryOptions,
} from './cart-types';
import type {CartSelectedDeliveryOptionInput} from '@shopify/hydrogen-react/storefront-api-types';

export type CartSelectedDeliveryOptionsUpdateFunction = (
  selectedDeliveryOptions: CartSelectedDeliveryOptionInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartSelectedDeliveryOptionsUpdateDefault(
  options: CartQueryOptions,
): CartSelectedDeliveryOptionsUpdateFunction {
  return async (selectedDeliveryOptions, optionalParams) => {
    const {cartSelectedDeliveryOptionsUpdate, errors} =
      await options.storefront.mutate<{
        cartSelectedDeliveryOptionsUpdate: CartQueryData;
        errors: StorefrontApiErrors;
      }>(CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION(options.cartFragment), {
        variables: {
          cartId: options.getCartId(),
          selectedDeliveryOptions,
          ...optionalParams,
        },
      });
    return {...cartSelectedDeliveryOptionsUpdate, errors};
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
