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
  const myCartLogics = CartLogic({
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
    addLine: (cartInput: CartActionInput) => {
      return storefront.mutate<{
        cartLinesAdd: {
          cart: Cart;
          errors: CartUserError[];
        };
        errors: UserError[];
      }>(CART_ADD_QUERY, {
        variables: {
          cartId: cartInput.cartId,
          lines: cartInput.lines,
        },
      });
    },
    removeLine: (cartInput: CartActionInput) => {
      return storefront.mutate<{
        cartLinesRemove: {
          cart: Cart;
          errors: CartUserError[];
        };
        errors: UserError[];
      }>(CART_REMOVE_QUERY, {
        variables: {
          cartId: cartInput.cartId,
          lineIds: cartInput.lineIds,
        },
      });
    },
    applyDiscountCode: (cartInput: CartActionInput) => {
      return storefront.mutate<{
        cartDiscountCodesUpdate: {
          cart: Cart;
        };
        errors: UserError[];
      }>(CART_APPLY_DISCOUNT, {
        variables: {
          cartId: cartInput.cartId,
          discountCodes: cartInput.discountCodes,
        },
      });
    },
  });

  return {
    ...myCartLogics,
    editInLine: (cartInput: CartActionInput) => {
      return myCartLogics.addLine(cartInput).then(() => {
        return myCartLogics.removeLine(cartInput);
      });
    },
  };
}

const cartFragment = /* GraphQL */ `
  fragment CartFragment on Cart {
    id
  }
`;

const errorFragment = /* GraphQL */ `
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

const CART_CREATE_QUERY = /* GraphQL */ `
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

const CART_ADD_QUERY = /* GraphQL */ `
  mutation CartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
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

const CART_REMOVE_QUERY = /* GraphQL */ `
  mutation CartLineRemove(
    $cartId: ID!
    $lineIds: [ID!]!
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFragment
      }
    }
  }
  ${cartFragment}
`;

const CART_APPLY_DISCOUNT = /* GraphQL */ `
  mutation CartDiscountCodesUpdate(
    $cartId: ID!
    $discountCodes: [String!]
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartFragment
      }
    }
  }
  ${cartFragment}
`;
