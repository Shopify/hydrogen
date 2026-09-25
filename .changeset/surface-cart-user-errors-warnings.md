---
"@shopify/hydrogen-react": minor
"@shopify/hydrogen": minor
---

Surface `userErrors` and `warnings` from Storefront API cart mutations. Previously, cart mutations only returned the updated cart object, silently discarding any user errors or warnings from the API. Now, `useCart()` exposes `userErrors` and `warnings` properties so you can display validation errors (e.g., invalid quantity) and warnings (e.g., discount not applicable) to your customers.
