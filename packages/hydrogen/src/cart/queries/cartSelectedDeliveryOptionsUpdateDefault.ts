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
import type {CartSelectedDeliveryOptionInput} from '@shopify/hydrogen-react/storefront-api-types';
import {
  getInContextVariables,
  getInContextDirective,
} from './cart-query-helpers';

export type CartSelectedDeliveryOptionsUpdateFunction = (
  selectedDeliveryOptions: CartSelectedDeliveryOptionInput[],
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

export function cartSelectedDeliveryOptionsUpdateDefault(
  options: CartQueryOptions,
): CartSelectedDeliveryOptionsUpdateFunction {
  return async (selectedDeliveryOptions, optionalParams) => {
    const includeVisitorConsent = optionalParams?.visitorConsent !== undefined;
    const {cartSelectedDeliveryOptionsUpdate, errors} =
      await options.storefront.mutate<{
        cartSelectedDeliveryOptionsUpdate: CartQueryData;
        errors: StorefrontApiErrors;
      }>(
        CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION(options.cartFragment, {
          includeVisitorConsent,
        }),
        {
          variables: {
            cartId: options.getCartId(),
            selectedDeliveryOptions,
            ...optionalParams,
          },
        },
      );
    return formatAPIResult(cartSelectedDeliveryOptionsUpdate, errors);
  };
}

type CartMutationBuilderOptions = {
  includeVisitorConsent?: boolean;
};

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartSelectedDeliveryOptionsUpdate
export const CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartMutationBuilderOptions = {},
) => `#graphql
  mutation cartSelectedDeliveryOptionsUpdate(
    $cartId: ID!
    $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!
    ${getInContextVariables(options.includeVisitorConsent ?? false)}
  ) ${getInContextDirective(options.includeVisitorConsent ?? false)} {
    cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
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
