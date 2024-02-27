import {
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
} from '@shopify/hydrogen';

// Override cart fragments
const cart = createCartHandler({
  storefront,
  getCartId: cartGetIdDefault(request.headers),
  setCartId: cartSetIdDefault(),
  cartQueryFragment: CART_QUERY_FRAGMENT,
  cartMutateFragment: CART_MUTATE_FRAGMENT,
});

// cartQueryFragment requirements:
// - Must be named `CartApiQuery`
// - Only have access to the following query variables:
//   - $cartId: ID!
//   - $country: CountryCode
//   - $language: LanguageCode
//   - $numCartLines: Int
const CART_QUERY_FRAGMENT = `#graphql
  fragment CartApiQuery on Cart {
    id
    totalQuantity
    checkoutUrl
    note
  }
`;

// cartMutateFragment requirements:
// - Must be named `CartApiMutation`
// - Only have access to the following query variables:
//   - $cartId: ID!
//   - $country: CountryCode
//   - $language: LanguageCode
const CART_MUTATE_FRAGMENT = `#graphql
  fragment CartApiMutation on Cart {
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
