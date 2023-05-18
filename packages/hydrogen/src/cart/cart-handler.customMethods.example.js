const cart = createCartHandler_unstable({
  storefront,
  requestHeaders: request.headers,
  customMethods: {
    example: () => 'example',
    addLines: async (lines, optionalParams) => {
      return await storefront.mutate(CART_LINES_ADD_MUTATION, {
        variables: {
          id: optionalParams.cartId,
          lines,
        },
      });
    },
  },
});

// Example usage
cart.example(); // 'example'
const result = await cart.addLines(
  [
    {
      merchandiseId: '123',
      quantity: 1,
    },
  ],
  {
    cartId: 'c-123',
  },
);
// Output of result:
// {
//   cartLinesAdd: {
//     cart: {
//       id: 'c-123',
//       totalQuantity: 1
//     },
//     errors: []
//   }
// }

const CART_LINES_ADD_MUTATION = `#graphql
  mutation CartLinesAdd(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $country: CountryCode = ZZ
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        totalQuantity
      }
      errors: userErrors {
        message
        field
        code
      }
    }
  }
`;
