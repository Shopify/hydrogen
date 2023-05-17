// Usage
cart.setMetafields(
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

cart.deleteMetafield(
  'public.gift',
  // Optional parameters
  {
    cartId: '123', // override the cart id
  },
);

// To query for metafields, use the `cartQueryFragment` option when creating the cart handler.
const cart = createCartHandler_unstable({
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
