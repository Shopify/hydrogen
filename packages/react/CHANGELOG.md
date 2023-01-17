# @shopify/hydrogen-react

## 2023.1.1

### Changes

- 9bff83c: Updated to Storefront API version `2023-01`

  ## Storefront API Changes

  The Storefront API changelog can be viewed [here](https://shopify.dev/api/release-notes/2023-01#graphql-storefront-api-changes). There are not any breaking changes in the Storefront API itself.

  ## Storefront Kit changes

  ### Breaking Changes

  - The default Cart query no longer uses `compareAtPriceV2` and `priceV2`; use `compareAtPrice` and `price` instead. The `V2` fields will be removed in an upcoming version of the Storefront API.
  - The storefront client and ShopifyProvider now provide the `storeDomain` exactly as it is received; it's recommended that you pass the domain with the protocol and the fully-qualified domain name for your Storefront. For example: `https://hydrogen-test.myshopify.com`
  - `parseMetafield`'s implementation has been updated and vastly improved so that it is correctly parsing all the metafield types.

    - The parsed metafield will now be found on the `parsedValue` property. For example:

      ```ts
      const metafield = parseMetafield(rawMetafield);

      console.log(metafield.parsedValue);
      ```

    - Additionally, a new TypeScript type called `ParsedMetafield` is provided to help the `parseMetafield` function return the correct TypeScript types, by passing the type of metafield into the `ParsedMetafield` type. For example:

      ```ts
      const metafield =
        parseMetafield<ParsedMetafield['boolean']>(rawMetafield);

      // parsedValue is a boolean
      if (metafield.parsedValue === true) {
      }
      ```

  - The `<Metafield/>` component has been removed; use `parseMetafield().parsedValue` to have control over what you want to render

  ### Other Changes

  - The TypeScript types for the returned value of `flattenConnection()` should now be friendlier: if you are using a `PartialDeep` object, you'll still get a `PartialDeep` object in return; if you're NOT using a `PartialDeep` object, then the returned type will not be wrapped in `PartialDeep`.

## 2022.10.8

### Patch Changes

- c1359eb: Actually add content to the READMEs so that they're seen when published to NPM.

## 2022.10.7

### Patch Changes

- 3d3d123: This is the final release of the package called "Hydrogen-UI." This package will be renamed to "storefront-kit", and will be published as `@shopify/storefront-kit-react`.

  See you in the new package!

## 2022.10.6

### Patch Changes

- f570f72: Added the `price` and `compareAtPrice` fields to our `defaultCartFragment`, which is used to get the Cart fields in the `<CartProvider />` component.

  The above fields should be identical to `priceV2` and `compareAtPriceV2`, with the exception that these `V2` fields are being deprecated in a future version of the Storefront API.

  We'll keep both for now, to help deveopers upgrade without issues, and then remove the `V2` versions in a future breaking update.

- 203abf9: Fix bad path for `require()` statements in non-Node environments.
- de1429e: CartProvider small internal fix to the last valid card and previous stored cart.

## 2022.10.5

### Patch Changes

- b1989c9: Fix issue with `package.json`'s `main` and `module` fields that were not updated to point to the new output directory structure.
- a776e01: Update the TypeScript types for `<Money/>` so that the default rendered element is a `"div"`.
- f1ffd57: Show storefront development warnings only once.

## 2022.10.4

### Patch Changes

- 6a3a0b3: Add `CartLinePrice` component
- ad4aca4: Update TypeScript types for `<MediaFile/>` so that `mediaOptions`'s properties are all optional instead of required.
- 669809a: `<ShopifyProvider/>` and `useShop()` updates:

  - Added a function `getShopifyDomain()` which will return a fully-qualified domain URL for your Shopify backend. For example:

    ```ts
    const {getShopifyDomain} = useShop();
    console.log(getShopifyDomain());
    // 'https://test.myshopify.com'
    ```

    This matches the function that was added to `createStorefrontClient()`.

  - ShopifyProvider's `storeDomain` prop can now accept the Shopify backend subdomain, matching how `createStorefrontClient()`'s `storeDomain` prop. ShopifyProvider still accepts a full domain, but that will be removed in a future breaking change.

  ```tsx
  // preferred
  <ShopifyProvider shopifyConfig={{storeDomain: 'shop'}}></ShopifyProvider>

  // still works, but will be removed in the future
  <ShopifyProvider shopifyConfig={{storeDomain: 'shop.myshopify.com'}}></ShopifyProvider>
  ```

## 2022.10.3

### Patch Changes

- ccfbbbd: Adds the functions `getStorefrontApiUrl()` and `getPublicTokenHeaders()` to the object returned by `useShop()` (and provided by `<ShopifyProvider/>`).

  For example:

  ```ts
  const {storefrontId, getPublicTokenHeaders, getStorefrontApiUrl} = useShop();

  fetch(getStorefrontApiUrl(), {
    headers: getPublicTokenHeaders({contentType: 'json'})
    body: {...}
  })
  ```

- 0683765: Adds CartLines components and hooks.

  - The `CartLineProvider` component creates a context for using a cart line.
  - The `useCartLine` hook provides access to the cart line object. It must be a descendent of a `CartProvider` component.

- 94fdddd: Provide a mapping of Storefront API's custom scalars to their actual types, for use with GraphQL CodeGen.

  For example:

  ```ts
  import {storefrontApiCustomScalars} from '@shopify/hydrogen-react';

  const config: CodegenConfig = {
    // Use the schema that's bundled with @shopify/hydrogen-react
    schema: './node_modules/@shopify/hydrogen-react/storefront.schema.json',
    generates: {
      './gql/': {
        preset: 'client',
        plugins: [],
        config: {
          // Use the custom scalar definitions that @shopify/hydrogen-react provides to improve the custom scalar types
          scalars: storefrontApiCustomScalars,
        },
      },
    },
  };
  ```

- 676eb75: Adds additional builds for Node-specific targets, to help ensure that server-side code was getting compiled for server-side runtimes, instead of browser-side code for server-side runtimes.
- 2dc6ac4: Add a new utility helper for getting the myshopify domain for the site:

  ```ts
  const client = createStorefrontClient(...);
  client.getShopifyDomain() === `https://testing.myshopify.com`;
  ```

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
