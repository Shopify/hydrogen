/* eslint-disable @typescript-eslint/no-unused-vars */
export async function action({context}) {
  const {cart} = context;

  // Usage
  const result = await cart.updateNote(
    'Some notes',
    // Optional parameters
    {
      cartId: '123', // override the cart id
    },
  );

  // Output of result:
  // {
  //   cart: {
  //     id: 'c1-123',
  //     totalQuantity: 0
  //   },
  //   errors: []
  // }
}
