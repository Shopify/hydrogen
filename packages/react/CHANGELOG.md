# @shopify/hydrogen-react

## 2022.10.2

### Patch Changes

- d31be71: Added <CartCheckoutButton /> that redirects to the CheckoutUrl when clicked.
- 8005144: Adds the AddToCartButton component. This component renders a button that adds an item to the cart when pressed.
- f1cb723: Adds BuyNowButton that adds an item to the cart and redirects the customer to checkout.
- a34f44d: Add `<CartCost/>` component
- 1ccbd1c: Introducing the new `metafieldParser()` function and `ParsedMetafield` type.

  ## `metafieldParser()`

  `metafieldParser()` is a temporary name; it will be renamed to `parseMetafield()` in a future release.

  The `metafieldParser()` function is an improvement and enhancement upon the existing `parseMetafield()` and `parseMetafieldValue()` functions. `metafieldParser()` now supports all Metafield types as outlined in the [Storefront API](https://shopify.dev/apps/metafields/types) documentation, including the list types!

  The parsed value can be found on the newly-added `parsedValue` property of the returned object from `metafieldParser()`. For example:

  ```js
  const parsed = metafieldParser(metafield);

  console.log(parsed.parsedValue);
  ```

  `parseMetafieldValue()` has been marked as deprecated and will be removed in a future version of Hydrogen-UI.

  ## The `ParsedMetafield` type

  For TypeScript developers, we also introduce the new `ParsedMetafield` type to help improve your experience. The `ParsedMetafield` type is an object in which the keys map to the type that will be returned from `metafieldParser()`. For example:

  ```ts
  ParsedMetafield['boolean'];
  // or
  ParsedMetafield['list.collection'];
  ```

  When used in conjunction with `metafieldParser()`, it will help TypeScript to understand what the returned object's `parsedValue` type is:

  ```ts
  const parsed = metafieldParser<ParsedMetafield['boolean']>(booleanMetafield)

  // type of `parsedValue` is `boolean | null`
  if(parsed.parsedValue) {
    ...
  }
  ```

  or

  ```ts
  const parsed = metafieldParser<ParsedMetafield['list.collection']>(
    listCollectionMetafield
  );

  // type of `parsedValue` is `Array<Collection> | null`
  parsed.parsedValue?.map((collection) => {
    console.log(collection?.name);
  });
  ```

- f7a3932: Update the TS types for MediaFile to allow className and other HTML attributes

## 2022.10.1

### Patch Changes

- 71b78b0: Initial release of version `2022-10`!

## 2022.7.1

### Patch Changes

- 702df8f: Fixed issue with TypeScript not being able to find the typings for `@shopify/hydrogen-react/storefront-api-types`
- b9c3940: Add `<CartProvider/>` and releated hooks & types.

  Component:

  - `<CartProvider/>`

  Hooks:

  - `useCart()`
  - `useCartFetch()`
  - `useInstantCheckout()`

  Types:

  - `CartState`
  - `CartStatus`
  - `Cart`
  - `CartWithActions`
  - `CartAction`

  Also updated `flattenConnection()` to better handle a `null` or `undefined` argument.
