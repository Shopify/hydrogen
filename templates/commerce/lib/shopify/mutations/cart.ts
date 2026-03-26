import CART_FRAGMENT from '../fragments/cart';

export const addToCartMutation = `#graphql
  mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...cart
      }
    }
  }
  ${CART_FRAGMENT}
` as const;

export const createCartMutation = `#graphql
  mutation createCart($lineItems: [CartLineInput!]) {
    cartCreate(input: { lines: $lineItems }) {
      cart {
        ...cart
      }
    }
  }
  ${CART_FRAGMENT}
` as const;

export const editCartItemsMutation = `#graphql
  mutation editCartItems($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...cart
      }
    }
  }
  ${CART_FRAGMENT}
` as const;

export const removeFromCartMutation = `#graphql
  mutation removeFromCart($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...cart
      }
    }
  }
  ${CART_FRAGMENT}
` as const;
