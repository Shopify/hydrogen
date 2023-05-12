const cart = createCartApi({
  storefront,
  requestHeaders: request.headers,
  customMethods: {
    example: () => 'example',
    addLine: async (cartInput) => {
      return await storefront.mutate(CART_LINES_ADD_MUTATION, {
        variables: {
          id: cartInput.id,
          lines: cartInput.lines,
        },
      });
    },
  },
});

// Example usage
cart.example(); // 'example'
const result = await cart.addLine({
  id: '123',
  lines: [
    {
      merchandiseId: '123',
      quantity: 1,
    },
  ],
});
// Output of result:
// {
//   cartLinesAdd: {
//     cart: {
//       id: '123',
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
