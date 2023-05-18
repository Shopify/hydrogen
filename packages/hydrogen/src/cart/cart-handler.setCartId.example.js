export async function action({context}) {
  const {cart} = context;

  const result = await cart.addLines([
    {
      merchandiseId: '123',
      quantity: 1,
    },
  ]);

  // Usage
  const headers = new Headers();
  cart.setCartId(result.cart.id, headers);
}
