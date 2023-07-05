export async function action({context}) {
  const {cart} = context;

  // Usage
  const result = await cart.updateAttributes(
    [
      {
        key: 'Somekey',
        value: '1',
      },
    ],
    // Optional parameters
    {
      cartId: '123', // override the cart id
    },
  );

  // Output of result:
  // {
  //   cart: {
  //     id: 'c1-123',
  //     totalQuantity: 1
  //   },
  //   errors: []
  // }
}
