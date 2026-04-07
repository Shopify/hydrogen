import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import type {CartSelectableAddressUpdateInput} from '@shopify/hydrogen-react/storefront-api-types';
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

export type CartDeliveryAddressesUpdateFunction = (
  addresses: Array<CartSelectableAddressUpdateInput>,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
export function cartDeliveryAddressesUpdateDefault(
  options: CartQueryOptions,
): CartDeliveryAddressesUpdateFunction {
  return async (
    addresses: Array<CartSelectableAddressUpdateInput>,
    optionalParams,
  ) => {
    const {cartDeliveryAddressesUpdate, errors} =
      await options.storefront.mutate<{
        cartDeliveryAddressesUpdate: CartQueryData;
        errors: StorefrontApiErrors;
      }>(CART_DELIVERY_ADDRESSES_UPDATE_MUTATION(options.cartFragment), {
        variables: {
          cartId: options.getCartId(),
          addresses,
          ...optionalParams,
        },
      });

    return formatAPIResult(cartDeliveryAddressesUpdate, errors);
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesUpdate
export const CART_DELIVERY_ADDRESSES_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartDeliveryAddressesUpdate(
    $cartId: ID!
    $addresses: [CartSelectableAddressUpdateInput!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
    $visitorConsent: VisitorConsent
  ) @inContext(country: $country, language: $language, visitorConsent: $visitorConsent) {
    cartDeliveryAddressesUpdate(addresses: $addresses, cartId: $cartId) {
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
