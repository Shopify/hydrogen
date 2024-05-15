import {defer, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Link} from '@remix-run/react';
import {CartForm, OptimisticCart, useOptimisticCart} from '@shopify/hydrogen';
import type {Cart} from '@shopify/hydrogen-react/storefront-api-types';

// Root loader returns the cart data
export async function loader({context}: LoaderFunctionArgs) {
  return defer({
    cart: context.cart.get(),
  });
}

// The cart component renders each line item in the cart.
export function Cart({cart}: {cart: OptimisticCart}) {
  // `useOptimisticCart` adds optimistic line items to the cart.
  // These line items are displayed in the cart until the server responds.
  const optimisticCart = useOptimisticCart(cart);

  if (!optimisticCart?.lines?.nodes?.length) return <p>Nothing in cart</p>;

  return optimisticCart.lines.nodes.map((line) => (
    <div key={line.id}>
      <Link to={`/products${line.merchandise.product.handle}`}>
        {line.merchandise.product.title}
      </Link>
      <CartForm
        route="/cart"
        action={CartForm.ACTIONS.LinesRemove}
        inputs={{lineIds: [line.id]}}
      >
        {/* Each line item has an `isOptimistic` property. Optimistic line items
        should have actions disabled */}
        <button type="submit" disabled={!!line.isOptimistic}>
          Remove
        </button>
      </CartForm>
    </div>
  ));
}
