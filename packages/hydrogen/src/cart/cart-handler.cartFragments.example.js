import {createCartHandler__unstable as createCartHandler} from '@shopify/hydrogen';

// Override cart fragments
const cart = createCartHandler({
  storefront,
  requestHeaders: request.headers,
  cartQueryFragment: CART_QUERY_FRAGMENT,
  cartMutateFragment: CART_MUTATE_FRAGMENT,
});

// cartQueryFragment requirements:
// - Must be named `CartFragment`
// - Only have access to the following query variables:
//   - $cartId: ID!
//   - $country: CountryCode
//   - $language: LanguageCode
//   - $numCartLines: Int
const CART_QUERY_FRAGMENT = `#graphql
  fragment CartFragment on Cart {
    id
    totalQuantity
    checkoutUrl
    note
  }
`;

// cartMutateFragment requirements:
// - Must be named `CartFragment`
// - Only have access to the following query variables:
//   - $cartId: ID!
//   - $country: CountryCode
//   - $language: LanguageCode
const CART_MUTATE_FRAGMENT = `#graphql
  fragment CartFragment on Cart {
    id
    totalQuantity
    checkoutUrl
    lines(first: 100) {
      edges {
        node {
          id
          quantity
        }
      }
    }
  }
`;
