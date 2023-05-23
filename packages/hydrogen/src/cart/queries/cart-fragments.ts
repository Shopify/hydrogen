export const USER_ERROR_FRAGMENT = `#graphql
  fragment ErrorFragment on CartUserError {
    message
    field
    code
  }
`;

export const MINIMAL_CART_FRAGMENT = `#graphql
  fragment CartFragment on Cart {
    id
    totalQuantity
  }
`;
