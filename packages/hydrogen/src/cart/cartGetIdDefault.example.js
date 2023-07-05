import {cartGetIdDefault, cartSetIdDefault} from '@shopify/hydrogen';

// server.js
export default {
  async fetch(request) {
    const cart = createCartHandler({
      storefront,
      getCartId: cartGetIdDefault(request.headers),
      setCartId: cartSetIdDefault(),
    });
  },
};

// Some route
export async function loader({context}) {
  const {cart} = context;

  cart.getCartId(); // gid://shopify/Cart/1234567890
}
