import {Storefront} from '@shopify/hydrogen';
import {type CartActionInput, CartLogic} from './lib/cart/cart-logic';
import type {
  Cart,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CartUserError,
  UserError,
  CartBuyerIdentityInput,
} from '@shopify/hydrogen/storefront-api-types';

export function MyCartQueries(storefront: Storefront) {
  return CartLogic({
    createCart: (cartInput: CartActionInput) => {
      return storefront.mutate<{
        cartCreate: {
          cart: Cart;
          errors: CartUserError[];
        };
        errors: UserError[];
      }>(CART_CREATE_QUERY, {
        variables: {
          input: cartInput,
        },
      });
    },
  });
}

export const cartFragment = /* GraphQL */ `
  fragment CartFragment on Cart {
    id
  }
`;

export const errorFragment = /* GraphQL */ `
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

export const CART_CREATE_QUERY = /* GraphQL */ `
  mutation CartCreate(
    $input: CartInput!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...CartFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${cartFragment}
  ${errorFragment}
`;
