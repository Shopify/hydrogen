import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import type {CartSelectableAddressInput} from '@shopify/hydrogen-react/storefront-api-types';
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
import {
  getInContextVariables,
  getInContextDirective,
  CartBuilderOptions,
  shouldIncludeVisitorConsent,
} from './cart-query-helpers';

export type CartDeliveryAddressesAddFunction = (
  addresses: Array<CartSelectableAddressInput>,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/**
 * Adds delivery addresses to the cart.
 *
 * This function sends a mutation to the storefront API to add one or more delivery addresses to the cart.
 * It returns the result of the mutation, including any errors that occurred.
 *
 * @param {CartQueryOptions} options - The options for the cart query, including the storefront API client and cart fragment.
 * @returns {CartDeliveryAddressAddFunction} - A function that takes an array of addresses and optional parameters, and returns the result of the API call.
 *
 * @example
 * const addDeliveryAddresses = cartDeliveryAddressesAddDefault({ storefront, getCartId });
 * const result = await addDeliveryAddresses([
 *    {
 *      address1: '123 Main St',
 *      city: 'Anytown',
 *      countryCode: 'US'
 *      // other address fields...
 *    }
 *  ], { someOptionalParam: 'value' }
 * );
 * @publicDocs
 */
export function cartDeliveryAddressesAddDefault(
  options: CartQueryOptions,
): CartDeliveryAddressesAddFunction {
  return async (
    addresses: Array<CartSelectableAddressInput>,
    optionalParams,
  ) => {
    const includeVisitorConsent = shouldIncludeVisitorConsent(optionalParams);
    const {cartDeliveryAddressesAdd, errors} = await options.storefront.mutate<{
      cartDeliveryAddressesAdd: CartQueryData;
      errors: StorefrontApiErrors;
    }>(
      CART_DELIVERY_ADDRESSES_ADD_MUTATION(options.cartFragment, {
        includeVisitorConsent,
      }),
      {
        variables: {
          cartId: options.getCartId(),
          addresses,
          ...optionalParams,
        },
      },
    );

    return formatAPIResult(cartDeliveryAddressesAdd, errors);
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesAdd
export const CART_DELIVERY_ADDRESSES_ADD_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
  options: CartBuilderOptions = {},
) => `#graphql
  mutation cartDeliveryAddressesAdd(
    $cartId: ID!
    $addresses: [CartSelectableAddressInput!]!,
    ${getInContextVariables(options.includeVisitorConsent)}
  ) ${getInContextDirective(options.includeVisitorConsent)} {
    cartDeliveryAddressesAdd(addresses: $addresses, cartId: $cartId) {
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
