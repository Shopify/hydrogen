/* eslint-disable @typescript-eslint/no-unused-vars */
export async function action({context}) {
  const {cart} = context;

  // Usage
  const result = await cart.addLines(
    [
      {
        merchandiseId: 'gid://shopify/ProductVariant/123456789',
        quantity: 1,
      },
    ],
    // Optional parameters
    {
      cartId: '123', // override the cart id
      country: 'US', // override the country code to 'US'
      language: 'EN', // override the language code to 'EN'
    },
  );
}

// Output of result:
// {
//   cart: {
//     id: 'c1-123',
//     totalQuantity: 1
//   },
//   errors: []
// }
