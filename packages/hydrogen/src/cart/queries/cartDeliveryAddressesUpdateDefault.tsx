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

/**
 * Updates delivery addresses in the cart.
 *
 * Pass an empty array to clear all delivery addresses from the cart (API version 2025-10+).
 *
 * @param {CartQueryOptions} options - The options for the cart query, including the storefront API client and cart fragment.
 * @returns {CartDeliveryAddressUpdateFunction} - A function that takes an array of addresses and optional parameters, and returns the result of the API call.
 *
 * @example Clear all delivery addresses (API 2025-10+)
 * const updateAddresses = cartDeliveryAddressesUpdateDefault(cartQueryOptions);
 * await updateAddresses([]);
 *
 * @example Update specific delivery addresses
 * const updateAddresses = cartDeliveryAddressesUpdateDefault(cartQueryOptions);
 * await updateAddresses([
    {
      "address": {
        "copyFromCustomerAddressId": "gid://shopify/<objectName>/10079785100",
        "deliveryAddress": {
          "address1": "<your-address1>",
          "address2": "<your-address2>",
          "city": "<your-city>",
          "company": "<your-company>",
          "countryCode": "AC",
          "firstName": "<your-firstName>",
          "lastName": "<your-lastName>",
          "phone": "<your-phone>",
          "provinceCode": "<your-provinceCode>",
          "zip": "<your-zip>"
        }
      },
      "id": "gid://shopify/<objectName>/10079785100",
      "oneTimeUse": true,
      "selected": true,
      "validationStrategy": "COUNTRY_CODE_ONLY"
    }
  ]);
 */
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
  ) @inContext(country: $country, language: $language) {
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
