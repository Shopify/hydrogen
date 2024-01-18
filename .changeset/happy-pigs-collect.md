---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

Better Hydrogen error handling

* Fix storefront client throwing on partial successful errors
* Fix subrequest profiler to better display network errors with url information for SFAPI requests

### Breaking change

 Mutation methods of `createCartHandler` used to return an `errors` object that contains `userErrors`. This is now changed back to `userErrors` to be consistent with SFAPI schema.

 The `errors` object will now be used for Graphql execution errors.

 Updated types:

 * `cart.get()` used to return a `Cart` type. Now it returns `CartReturn` type to accommodate the `errors` object
 * All other `cart` methods (ie. `cart.addLines`) used to return a `CartQueryData` type. Now it returns `CartQueryDataReturn` type to accommodate the `errors` object.
