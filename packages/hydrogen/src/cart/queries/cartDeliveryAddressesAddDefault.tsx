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

export type CartDeliveryAddressesAddFunction = (
  addresses: Array<CartSelectableAddressInput>,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
export function cartDeliveryAddressesAddDefault(
  options: CartQueryOptions,
): CartDeliveryAddressesAddFunction {
  return async (
    addresses: Array<CartSelectableAddressInput>,
    optionalParams,
  ) => {
    const {cartDeliveryAddressesAdd, errors} = await options.storefront.mutate<{
      cartDeliveryAddressesAdd: CartQueryData;
      errors: StorefrontApiErrors;
    }>(CART_DELIVERY_ADDRESSES_ADD_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        addresses,
        ...optionalParams,
      },
    });

    return formatAPIResult(cartDeliveryAddressesAdd, errors);
  };
}

//! @see: https://shopify.dev/docs/api/storefront/latest/mutations/cartDeliveryAddressesAdd
export const CART_DELIVERY_ADDRESSES_ADD_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartDeliveryAddressesAdd(
    $cartId: ID!
    $addresses: [CartSelectableAddressInput!]!,
    $country: CountryCode = ZZ
    $language: LanguageCode
    $visitorConsent: VisitorConsent
  ) @inContext(country: $country, language: $language, visitorConsent: $visitorConsent) {
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
