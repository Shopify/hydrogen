import { StorefrontApiErrors, formatAPIResult } from '../../storefront';
import type { Scalars } from '@shopify/hydrogen-react/storefront-api-types';
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

export type CartDeliveryAddressesRemoveFunction = (
  addressIds: Array<Scalars['ID']>,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/**
 * Removes delivery addresses from the cart.
 *
 * This function sends a mutation to the storefront API to remove one or more delivery addresses from the cart.
 * It returns the result of the mutation, including any errors that occurred.
 *
 * @param {CartQueryOptions} options - The options for the cart query, including the storefront API client and cart fragment.
 * @returns {CartDeliveryAddressRemoveFunction} - A function that takes an array of address IDs and optional parameters, and returns the result of the API call.
 *
 * @example
 * const removeAddresses = cartDeliverAddressRemoveDefault(cartQueryOptions);
 * const result = await removeAddresses(["gid://shopify/<objectName>/10079785100"], { someOptionalParam: 'value' });
 */
export function cartDeliveryAddressesRemoveDefault(
  options: CartQueryOptions,
): CartDeliveryAddressesRemoveFunction {
  return async (addressIds: Array<Scalars['ID']>, optionalParams) => {
    const { cartDeliveryAddressesRemove, errors } = await options.storefront.mutate<{
      cartDeliveryAddressesRemove: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_DELIVERY_ADDRESSES_REMOVE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        addressIds,
        ...optionalParams,
      },
    });

    return formatAPIResult(cartDeliveryAddressesRemove, errors);
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesRemove
export const CART_DELIVERY_ADDRESSES_REMOVE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartDeliveryAddressesRemove(
    $cartId: ID!
    $addressIds: [ID!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDeliveryAddressesRemove(addressIds: $addressIds, cartId: $cartId) {
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
