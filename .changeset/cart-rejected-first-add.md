---
"@shopify/hydrogen": patch
---

When the Storefront API refuses a first add to cart, for example for a variant that doesn't exist, the user errors now reach the cart store's `errors` and the product form's `errors.userErrors`. The cart endpoint answers with `cart: null` and the user errors, and Hydrogen's Standard Actions handler passed that result on. Standard Actions results need a cart, so `Shopify.actions.updateCart` rejected with `TypeError: Cannot read properties of null (reading 'lines')` and the buyer saw no error. The handler now rejects with the user errors as the cause, as Standard Actions' own handler does.
