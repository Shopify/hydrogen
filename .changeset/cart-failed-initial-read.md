---
"@shopify/hydrogen": major
---

PROTOTYPE: `useCart` now throws until the cart is ready, and the new `useCartStatus` hook reports where the cart is in its load lifecycle.

A failed cart read no longer looks like an empty cart. Before the cart is ready, the cart state holds an empty placeholder cart, so a component that read it showed "Your cart is empty" while the cart was loading or after the server failed to read it. `useCart` now throws in both cases instead of returning the placeholder.

Read `useCartStatus()` in a parent component, and render the components that call `useCart` only when the status is `ready`:

```tsx
function Cart() {
  const cartStatus = useCartStatus();
  if (cartStatus.status === "loading") return <CartSkeleton />;
  if (cartStatus.status === "failed") {
    return <button onClick={cartStatus.retry}>Try again</button>;
  }
  return <CartLines />; // calls useCart
}
```

`useCartStatus()` returns `{status: "loading"}`, `{status: "failed", error, retrying, retry}`, or `{status: "ready"}`, and never throws inside `CartProvider`. `useSuspenseCart` still suspends while the cart loads, and now throws to the nearest error boundary when the cart failed to load. Outside React, `getCartLoadStatus(store.getState())` returns the same lifecycle.

A cart change from the failed state, such as an add to cart, now reloads the full cart in the background, and only that reload moves the cart to `ready`. `trackCartAnalytics` now updates its baseline when the cart's lines change without a new `updatedAt`, so that reload doesn't report lines that were already in the cart as added.
