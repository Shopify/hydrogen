import CART_FRAGMENT from '../fragments/cart';

export const getCartQuery = `#graphql
  query getCart($cartId: ID!) {
    cart(id: $cartId) {
      ...cart
    }
  }
  ${CART_FRAGMENT}
` as const;
