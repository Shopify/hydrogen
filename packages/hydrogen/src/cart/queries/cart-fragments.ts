export const USER_ERROR_FRAGMENT = `#graphql
  fragment CartApiError on CartUserError {
    message
    field
    code
  }
`;

export const MINIMAL_CART_FRAGMENT = `#graphql
  fragment CartApiMutation on Cart {
    id
    totalQuantity
  }
`;
