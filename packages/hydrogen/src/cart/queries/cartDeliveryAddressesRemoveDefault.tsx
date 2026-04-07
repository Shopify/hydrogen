import {StorefrontApiErrors, formatAPIResult} from '../../storefront';
import type {Scalars} from '@shopify/hydrogen-react/storefront-api-types';
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
  addressIds: Array<Scalars['ID']['input']> | Array<string>,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryDataReturn>;

/** @publicDocs */
export function cartDeliveryAddressesRemoveDefault(
  options: CartQueryOptions,
): CartDeliveryAddressesRemoveFunction {
  return async (
    addressIds: Array<Scalars['ID']['input']> | string[],
    optionalParams,
  ) => {
    const {cartDeliveryAddressesRemove, errors} =
      await options.storefront.mutate<{
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
    $visitorConsent: VisitorConsent
  ) @inContext(country: $country, language: $language, visitorConsent: $visitorConsent) {
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
