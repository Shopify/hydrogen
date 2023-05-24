export async function action({context}) {
  const {cart} = context;

  const result = await cart.addLines([
    {
      merchandiseId: 'gid://shopify/ProductVariant/123456789',
      quantity: 1,
    },
  ]);

  // Usage
  const headers = new Headers();
  cart.setCartId(result.cart.id, headers);
}
