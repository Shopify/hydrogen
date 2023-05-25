export async function action({context}) {
  const {cart} = context;

  // Usage
  const result = await cart.setMetafields(
    [
      {
        key: 'public.gift',
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
    'public.gift',
    // Optional parameters
    {
      cartId: '123', // override the cart id
    },
  );
}

// server.js
// To query for metafields, use the `cartQueryFragment` option when creating the cart handler.
import {createCartHandler__unstable as createCartHandler} from '@shopify/hydrogen';

const cart = createCartHandler({
  storefront,
  requestHeaders: request.headers,
  cartQueryFragment: CART_QUERY_FRAGMENT,
});

const CART_QUERY_FRAGMENT = `#graphql
  fragment CartFragment on Cart {
    id
    metafields(
      identifiers: [{
        namespace: "public",
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
