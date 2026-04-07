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

export type CartDeliveryAddressesReplaceFunction = (
  addresses: Array<CartSelectableAddressInput>,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
export function cartDeliveryAddressesReplaceDefault(
  options: CartQueryOptions,
): CartDeliveryAddressesReplaceFunction {
  return async (
    addresses: Array<CartSelectableAddressInput>,
    optionalParams,
  ) => {
    const {cartDeliveryAddressesReplace, errors} =
      await options.storefront.mutate<{
        cartDeliveryAddressesReplace: CartQueryData;
        errors: StorefrontApiErrors;
      }>(CART_DELIVERY_ADDRESSES_REPLACE_MUTATION(options.cartFragment), {
        variables: {
          cartId: options.getCartId(),
          addresses,
          ...optionalParams,
        },
      });

    return formatAPIResult(cartDeliveryAddressesReplace, errors);
  };
}

//! @see: https://shopify.dev/docs/api/storefront/2026-04/mutations/cartDeliveryAddressesReplace
export const CART_DELIVERY_ADDRESSES_REPLACE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartDeliveryAddressesReplace(
    $cartId: ID!
    $addresses: [CartSelectableAddressInput!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartDeliveryAddressesReplace(addresses: $addresses, cartId: $cartId) {
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
