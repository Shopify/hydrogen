export const A = `#graphql
  query layout {
    shop {
      name
      description
    }
  }
`;

export const B = `#graphql
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
      }
    }
  }
`;
