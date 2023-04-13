import {
  type CartQueryOptions,
  type CartQueryFunction,
  type CartQueryData,
  type CartCreate,
  type CartLinesAdd,
  cartCreateDefault,
  cartGetDefault,
  CartFormInput,
  cartLineAddDefault,
} from '@shopify/hydrogen';
import {Cart} from '@shopify/hydrogen/storefront-api-types';

type MyCartQueryOptions = Omit<CartQueryOptions, 'query'>;

export type MyCartQueryReturn = {
  get: () => Cart;
  getId: () => string | undefined;
  create: (cartInput: CartFormInput) => CartQueryData;
  addLine: (cartInput: CartFormInput) => CartQueryData;
};

export function myCartQueries(options: MyCartQueryOptions): MyCartQueryReturn {
  const {getStoredCartId} = options;
  const cartId = options.getStoredCartId();
  const createCart = async (cartInput: Pick<CartCreate, 'input'>) => {
    const {cartCreate} = await options.storefront.mutate<{
      cartCreate: CartQueryData;
    }>(CREATE_CART_MUTATION, {
      variables: cartInput,
    });
    return cartCreate;
  };

  return {
    get: cartGetDefault({
      ...options,
      query: CART_QUERY,
      variables: {
        id: cartId,
      },
    }),
    getId: getStoredCartId,
    create: createCart,
    addLine: async (cartInput: Pick<CartLinesAdd, 'lines'>) => {
      if (cartId) {
        const {cartLinesAdd} = await options.storefront.mutate<{
          cartLinesAdd: CartQueryData;
        }>(ADD_LINES_MUTATION, {
          variables: {
            cartId,
            ...cartInput,
          },
        });
        return cartLinesAdd;
      } else {
        return await createCart({input: cartInput});
      }
    },
  };
}

// Demo store's cart query just a tad bit different than the default cart query in hydrogen-react
// TO-DO: Look into if we want to align this so that demo store doesn't need to override
const CART_QUERY = `#graphql
  query CartQuery($id: ID!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    cart(id: $id) {
      ...CartFragment
    }
  }

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
    lines(first: 100) {
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
            amountPerQuantity {
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

const USER_ERROR_FRAGMENT = `#graphql
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

const LINES_CART_FRAGMENT = `#graphql
  fragment CartLinesFragment on Cart {
    id
    totalQuantity
  }
`;

//! @see: https://shopify.dev/api/storefront/2022-01/mutations/cartcreate
const CREATE_CART_MUTATION = `#graphql
  mutation ($input: CartInput!, $country: CountryCode = ZZ, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartCreate(input: $input) {
      cart {
        ...CartLinesFragment
        checkoutUrl
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${LINES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

const ADD_LINES_MUTATION = `#graphql
  mutation ($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode = ZZ, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartLinesFragment
      }
      errors: userErrors {
        ...ErrorFragment
      }
    }
  }
  ${LINES_CART_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
