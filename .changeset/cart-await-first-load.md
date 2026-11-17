---
"@shopify/hydrogen": patch
---

Cart changes made while the cart is still loading in the browser now apply to the loaded cart. Before, adding 1 to a cart of 3 during the load showed 1 until a second cart fetch brought back the rest, and applying a discount code removed the cart's existing codes. The change still shows at once, but its request waits for the load. `hydrate()` during the load works the same way. A promise `initialData` that hasn't settled after 30 seconds counts as a failed load. While `loading` is `true`, `lines` can now hold the changes made so far, so show them with a loading note instead of a skeleton, and disable the controls of lines whose ID starts with `optimistic:`. The `hydrogen-cart-ui` and `hydrogen-setup` skills now read the cart in the React Router cart route's loader instead of the root loader, so other routes' responses are no longer private.
