import {
  createCartHandler__unstable as createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
  cartLinesAddDefault,
  cartLinesRemoveDefault,
} from '@shopify/hydrogen';

const mutationOptions = {
  storefront,
  getCartId: cartGetIdDefault(request.headers),
};

const cart = createCartHandler({
  storefront,
  getCartId: cartGetIdDefault(request.headers),
  setCartId: cartSetIdDefault(),
  customMethods: {
    editInPlace: async (removeLineIds, addLines, optionalParams) => {
      // Using Hydrogen default cart query methods
      await cartLinesAddDefault(mutationOptions)(addLines, optionalParams);
      return await cartLinesRemoveDefault(mutationOptions)(
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

// Use custom method editInPlace that delete and add items in one method
cart.editInPlace(
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
