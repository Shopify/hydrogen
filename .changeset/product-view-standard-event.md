---
"@shopify/hydrogen": minor
---

Dispatch the `shopify:product:view` Standard Event with `context: "page"` from the product form store. The store dispatches it on `document` in the browser when you create it, and again when `hydrate()` loads a product with a different ID. `ProductProvider` and direct `createProductFormStore()` users get the event with no code change. Variant changes, reconnects, and re-renders don't dispatch it again, and the server never dispatches it.
