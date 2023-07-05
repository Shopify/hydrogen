import {MINIMAL_CART_FRAGMENT, USER_ERROR_FRAGMENT} from './cart-fragments';
import type {
  CartOptionalInput,
  CartQueryData,
  CartQueryOptions,
} from './cart-types';

export type CartNoteUpdateFunction = (
  note: string,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

export function cartNoteUpdateDefault(
  options: CartQueryOptions,
): CartNoteUpdateFunction {
  return async (note, optionalParams) => {
    const {cartNoteUpdate} = await options.storefront.mutate<{
      cartNoteUpdate: CartQueryData;
    }>(CART_NOTE_UPDATE_MUTATION(options.cartFragment), {
      variables: {
        cartId: options.getCartId(),
        note,
        ...optionalParams,
      },
    });
    return cartNoteUpdate;
  };
}

//! @see https://shopify.dev/docs/api/storefront/latest/mutations/cartNoteUpdate
export const CART_NOTE_UPDATE_MUTATION = (
  cartFragment = MINIMAL_CART_FRAGMENT,
) => `#graphql
  mutation cartNoteUpdate(
    $cartId: ID!
    $note: String
    $language: LanguageCode
    $country: CountryCode
  ) @inContext(country: $country, language: $language) {
    cartNoteUpdate(cartId: $cartId, note: $note) {
      cart {
        ...CartApiMutation
      }
      errors: userErrors {
        ...CartApiError
      }
    }
  }
  ${cartFragment}
  ${USER_ERROR_FRAGMENT}
`;
