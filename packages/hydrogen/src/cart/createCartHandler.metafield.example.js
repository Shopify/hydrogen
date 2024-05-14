/* eslint-disable @typescript-eslint/no-unused-vars */
export async function action({context}) {
  const {cart} = context;

  // Usage
  const result = await cart.setMetafields(
    [
      {
        key: 'custom.gift',
        type: 'boolean',
        value: 'true',
      },
    ],
    // Optional parameters
    {
      cartId: '123', // override the cart id
    },
  );

  const result2 = await cart.deleteMetafield(
    'custom.gift',
    // Optional parameters
    {
      cartId: '123', // override the cart id
    },
  );
}

// server.js
// To query for metafields, use the `cartQueryFragment` option when creating the cart handler.
import {
  createCartHandler,
  cartGetIdDefault,
  cartSetIdDefault,
} from '@shopify/hydrogen';

const cart = createCartHandler({
  storefront,
  getCartId: cartGetIdDefault(request.headers),
  setCartId: cartSetIdDefault(),
  cartQueryFragment: CART_QUERY_FRAGMENT,
});

const CART_QUERY_FRAGMENT = `#graphql
  fragment CartApiQuery on Cart {
    id
    metafields(
      identifiers: [{
        namespace: "custom",
        key: "gift"
      ])
    {
      namespace
      key
      type
      value
    }

  }
`;
