---
'@shopify/hydrogen': major
---

Better Hydrogen error handling

* Fix storefront client throwing on partial successful errors
* Fix subrequest profiler to better display network errors with URL information for Storefront API requests

### Breaking change

This update changes the shape of the error objects returned by the `createCartHandler` method.

Previously, mutations could return an `errors` array that contained a `userErrors` array.

With this change, these arrays are no longer nested. The response can contain both an `errors` array and a `userErrors` array. `errors` contains GraphQL execution errors. `userErrors` contains errors caused by the cart mutation itself (such as adding a product that has zero inventory).

`storefront.isApiError` is deprecated.

### Updated return types for `createCartHandler` methods

* `cart.get()` used to return a `Cart` type. Now it returns `CartReturn` type to accommodate the `errors` object.
* All other `cart` methods (ie. `cart.addLines`) used to return a `CartQueryData` type. Now it returns `CartQueryDataReturn` type to accommodate the `errors` object.
