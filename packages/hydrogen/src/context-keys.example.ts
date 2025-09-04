// Import from local files to get proper types
import {hydrogenContext} from './context-keys';
import type {HydrogenRouterContextProvider} from './types';

// These examples show how to use hydrogenContext with React Router's context.get() pattern
// In a real app, you would import from '@shopify/hydrogen' and have proper type augmentation

// Example loader using context.get() pattern
export async function loader({
  context,
}: {
  context: HydrogenRouterContextProvider;
}) {
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

// Example action using context.get() pattern
export async function action({
  context,
  request,
}: {
  context: HydrogenRouterContextProvider;
  request: Request;
}) {
  // Access only the services you need
  const cart = context.get(hydrogenContext.cart);
  const session = context.get(hydrogenContext.session);

  const formData = await request.formData();
  const lines = formData.get('lines');

  // Add items to cart
  const result = await cart.addLines(lines as any);

  // Update session if needed
  session.set('cartId', result.cart.id);

  return {cart: result};
}

// Example showing both patterns work
export async function hybridExample({
  context,
}: {
  context: HydrogenRouterContextProvider;
}) {
  // Pattern 1: Direct property access (existing pattern)
  const directStorefront = context.storefront;
  const directCart = context.cart;

  // Pattern 2: context.get() with hydrogenContext (new pattern)
  const viaGetStorefront = context.get(hydrogenContext.storefront);
  const viaGetCart = context.get(hydrogenContext.cart);

  // Both patterns return the same instances
  console.assert(
    directStorefront === viaGetStorefront,
    'Both patterns access same storefront',
  );
  console.assert(directCart === viaGetCart, 'Both patterns access same cart');

  return {success: true};
}
