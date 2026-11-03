---
"@shopify/hydrogen": minor
---

Cart stores can load and change the cart through your own service. Pass a `CartTransport` (`getCart` and `updateCart`) as the `transport` option of `createCartStore`, or the `transport` prop of the React and Vue `CartProvider`. A store with a transport needs no Standard Actions script, ignores `shopify:cart:*` events, and sends the cart ID with every call, one change at a time, so two stores on one page can use different transports and a transport can keep no state.

Cart stores and `useCartActions()` also gain `addLines`, `updateLines`, `removeLines`, `setDiscountCodes`, `setNote`, and `setAttributes`, which change the cart from code with the same optimistic updates, pending state, and errors as cart forms. They work with or without a transport. A newer change to one line no longer cancels a pending change to several lines; the other lines still apply.
