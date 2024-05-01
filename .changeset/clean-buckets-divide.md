---
'@shopify/hydrogen': patch
---

Add the `useOptimisticCart()` hook. This hook takes the cart object as a parameter, and processes all pending cart actions, locally mutating the cart with optimistic state. An optimistic cart makes cart actions immediately render in the browser while the action syncs to the server. This increases the perceived performance of the application.

Example usage:

```tsx
// Root loader returns the cart data
export async function loader({context}: LoaderFunctionArgs) {
  return defer({
    cart: context.cart.get(),
  });
}

// The cart component renders each line item in the cart.
export function Cart({cart}) {
  if (!cart?.lines?.nodes?.length) return <p>Nothing in cart</p>;

  return cart.lines.nodes.map((line) => (
    <div key={line.id}>
      <Link to={`/products${line.merchandise.produce.handle}`}>
        {line.merchandise.product.title}
      </Link>
    </div>
  ));
}
```

The problem with this code is that it can feel slow. If a new item is added to the cart, it won't render until the server action completes and the client revalidates the root loader with the new cart data.

If we update the cart implementation with a new `useOptimisticCart()` hook, Hydrogen can take the pending add to cart action, and apply it locally with the existing cart data:

```tsx
export function Cart({cart}) {
  const optimisticCart = useOptimisticCart(cart);

  if (!optimisticCart?.lines?.nodes?.length) return <p>Nothing in cart</p>;

  return optimisticCart.lines.nodes.map((line) => (
    <div key={line.id}>
      <Link to={`/products${line.merchandise.product.handle}`}>
        {line.merchandise.product.title}
      </Link>
    </div>
  ));
}
```

This works automatically with the `CartForm.ACTIONS.LinesUpdate` and `CartForm.ACTIONS.LinesRemove`. To make it work with `CartForm.Actions.LinesAdd`, update the `CartForm` to include the `selectedVariant`:

```tsx
export function ProductCard({product}) {
  return (
    <div>
      <h2>{product.title}</h2>
      <CartForm
        route="/cart"
        action={CartForm.ACTIONS.LinesAdd}
        inputs={{
          lines: [
            {
              merchandiseId: product.selectedVariant.id,
              quantity: 1,
              // The whole selected variant is not needed on the server, used in
              // the client to render the product until the server action resolves
              selectedVariant: product.selectedVariant,
            },
          ],
        }}
      >
        <button type="submit">Add to cart</button>
      </CartForm>
    </div>
  );
}
```

Sometimes line items need to render differently when they have yet to process on the server. A new isOptimistic flag is added to each line item:

```tsx
export function Cart({cart}) {
  const optimisticCart = useOptimisticCart(cart);

  if (!cart?.lines?.nodes?.length) return <p>Nothing in cart</p>;

  return optimisticCart.lines.nodes.map((line) => (
    <div key={line.id} style={{opacity: line.isOptimistic ? 0.8 : 1}}>
      <Link to={`/products${line.merchandise.product.handle}`}>
        {line.merchandise.product.title}
      </Link>
      <CartForm
        route="/cart"
        action={CartForm.ACTIONS.LinesRemove}
        inputs={{lineIds}}
        disabled={line.isOptimistic}
      >
        <button type="submit">Remove</button>
      </CartForm>
    </div>
  ));
}
```
