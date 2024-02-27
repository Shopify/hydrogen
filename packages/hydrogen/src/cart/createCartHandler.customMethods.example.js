import {
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
  cartLinesAddDefault,
  cartLinesRemoveDefault,
} from '@shopify/hydrogen';

const cartQueryOptions = {
  storefront,
  getCartId: cartGetIdDefault(request.headers),
};

const cart = createCartHandler({
  storefront,
  getCartId: cartGetIdDefault(request.headers),
  setCartId: cartSetIdDefault(),
  customMethods__unstable: {
    editInLine: async (addLines, removeLineIds, optionalParams) => {
      // Using Hydrogen default cart query methods
      await cartLinesAddDefault(cartQueryOptions)(addLines, optionalParams);
      return await cartLinesRemoveDefault(cartQueryOptions)(
        removeLineIds,
        optionalParams,
      );
    },
    addLines: async (lines, optionalParams) => {
      // With your own Storefront API graphql query
      return await storefront.mutate(CART_LINES_ADD_MUTATION, {
        variables: {
          id: optionalParams.cartId,
          lines,
        },
      });
    },
  },
});

// Use custom method editInLine that delete and add items in one method
cart.editInLine(
  ['123'],
  [
    {
      merchandiseId: 'gid://shopify/ProductVariant/456789123',
      quantity: 1,
    },
  ],
);

// Use overridden cart.addLines
const result = await cart.addLines(
  [
    {
      merchandiseId: 'gid://shopify/ProductVariant/123456789',
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
