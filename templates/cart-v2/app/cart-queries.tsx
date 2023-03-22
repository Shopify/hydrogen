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

export function myCartQueries(storefront: Storefront) {
  const myCartLogics = CartLogic({
    get: async (cartInput: CartActionInput) => {
      console.log('get', cartInput);
      if (!cartInput?.cartId) {
        return null;
      }

      const {cart} = await storefront.query<{cart: Cart}>(CART_QUERY, {
        variables: {
          id: cartInput.cartId,
        },
        cache: storefront.CacheNone(),
      });
      return cart;
    },
    createCart: async (cartInput: CartActionInput) => {
      console.log('createCart', cartInput);
      const {cartCreate, errors} = await storefront.mutate<{
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
      return Promise.resolve({
        cart: cartCreate.cart,
        errors,
      });
    },
    addLine: async (cartInput: CartActionInput) => {
      console.log('addLine', cartInput);
      const {cartLinesAdd, errors} = await storefront.mutate<{
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
      return Promise.resolve({
        cart: cartLinesAdd.cart,
        errors,
      });
    },
    removeLine: async (cartInput: CartActionInput) => {
      console.log('removeLine', cartInput);
      const {cartLinesRemove, errors} = await storefront.mutate<{
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
      return Promise.resolve({
        cart: cartLinesRemove.cart,
        errors,
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

const mutateCartFragment = /* GraphQL */ `
  fragment CartFragment on Cart {
    id
  }
`;

const cartFragment = /* GraphQL */ `
  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                ...MoneyFragment
              }
              price {
                ...MoneyFragment
              }
              requiresShipping
              title
              image {
                ...ImageFragment
              }
              product {
                handle
                title
                id
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        ...MoneyFragment
      }
      totalAmount {
        ...MoneyFragment
      }
      totalDutyAmount {
        ...MoneyFragment
      }
      totalTaxAmount {
        ...MoneyFragment
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
    }
  }

  fragment MoneyFragment on MoneyV2 {
    currencyCode
    amount
  }

  fragment ImageFragment on Image {
    id
    url
    altText
    width
    height
  }
`;

const errorFragment = /* GraphQL */ `
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

const CART_QUERY = /* GraphQL */ `
  query CartQuery(
    $id: ID!
    $numCartLines: Int = 250
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cart(id: $id) {
      ...CartFragment
    }
  }
  ${cartFragment}
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
  ${mutateCartFragment}
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
  ${mutateCartFragment}
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
  ${mutateCartFragment}
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
  ${mutateCartFragment}
`;
