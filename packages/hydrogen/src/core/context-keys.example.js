import {hydrogenContext} from '@shopify/hydrogen';

export async function loader({context}) {
  // Access services using the grouped hydrogenContext object
  const storefront = context.get(hydrogenContext.storefront);
  const cart = context.get(hydrogenContext.cart);
  const customerAccount = context.get(hydrogenContext.customerAccount);
  const env = context.get(hydrogenContext.env);
  const session = context.get(hydrogenContext.session);
  const waitUntil = context.get(hydrogenContext.waitUntil);

  // Use the services as needed
  const {product} = await storefront.query(
    `#graphql
      query Product($handle: String!) {
        product(handle: $handle) {
          title
          handle
        }
      }
    `,
    {
      variables: {handle: 'example-product'},
    },
  );

  return {product};
}

export async function action({context, request}) {
  // Access only the services you need
  const cart = context.get(hydrogenContext.cart);
  const session = context.get(hydrogenContext.session);

  const formData = await request.formData();
  const lines = formData.get('lines');

  // Add items to cart
  const result = await cart.addLines(lines);

  // Update session if needed
  session.set('cartId', result.cart.id);

  return {cart: result};
}
