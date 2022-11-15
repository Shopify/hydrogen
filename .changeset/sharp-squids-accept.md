---
'@shopify/hydrogen-react': patch
---

Adds CartLines components and hooks.

- The `CartLineProvider` component creates a context for using a cart line.
- The `useCartLine` hook provides access to the cart line object. It must be a descendent of a `CartProvider` component.
