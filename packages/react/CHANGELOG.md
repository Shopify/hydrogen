# @shopify/hydrogen-react

## 2023.1.5

### Patch Changes

- b8757bd: Fix the UMD global variable name from `storefrontkitreact` to `hydrogenreact`.
- 6225d33: Add a deprecation notice to `<CartLinePrice/>`:

  Use `Money` instead. To migrate, use the `priceType` prop that matches the corresponding property on the `CartLine` object:

  - `regular`: `cartLine.cost.totalAmount`
  - `compareAt`: `cartLine.cost.compareAtAmountPerQuantity`

  For example:

  ```jsx
  // before
  <CartLinePrice data={cartLine} priceType="regular" />
  // after
  <Money data={cartLine.cost.totalAmount} />
  ```

- 2bb8c81: Adding `<CartLineQuantity />` and `<CartLineQuantityAdjustButton />`

  The `<CartLineQuantity />` and `<CartLineQuantityAdjustButton />` components have been added / migrated over from Hydrogen v1.

  Additionally, fixed a bug when using `<CartLineQuantityAdjustButton />` that caused CartLine Attributes to be erased. CartLine Attributes should now be persisted when using that component.

  ## `useCartLine()` TypeScript types update

  `useCartLine()`'s TypeScript type originally returned a `CartLine`. It has now been updated to be `PartialDeep<CartLine>`, which makes all the properties optional instead of required. This matches with the rest of hydrogen-react in that we can't know or guarnatee what properties exist on certain objects so we reflect that state in the TypeScript types.

- eb1656f: Update docs

## 2023.1.4

### Major Changes

This is admittedly a strange release.

It has been decided to rename the repo back to `@shopify/hydrogen-react`, and with that we're abandoning the name `@shopify/storefront-kit-react`. Sorry about that, and hopefully it isn't too big of an inconvenience.

Additionally, the renaming offered an opportunity to introduce a couple of breaking changes that normally we wouldn't do in a `patch` release. This is the one and only time that we'll do this, so again, we apologize for the strangeness and inconvenience.

Depending on your upgrade path, here's a summary of the changes you need to be aware of:

- If upgrading from `@shopify/storefront-kit-react`
  - Please note the breaking changes below to [`<ShopifyProvider />`](#shopifyprovider) and [`useShop()`](#useshop)
  - Please note the breaking changes below to the Analytics components
- If upgrading from an older release of `@shopify/hydrogen-react`
  - Please note the breaking changes below to [`<ShopifyProvider />`](#shopifyprovider) and [`useShop()`](#useshop)
  - Analytics components were [added in 2023.1.2](#202312), and then were updated in this release
  - Please note the breaking changes in the [`2023.1.1`](#202311) release below

---

The detailed changelog now follows:

- 8d8ab13: ## Breaking Changes on Shopify analytics components

  - `useShopifyCookies` - if hasUserConsent is `false`, no cookies will be set
  - `sendShopifyAnalytics` - if `hasUserConsent` is false, no analytics will be sent
  - `ShopifyAppSource` got rename to `ShopifySalesChannel`
  - `getClientBrowserParameters` returns empty string for each field key if run on server
  - Added documents on analytics components

- 6184517: Added the following components and hooks, which have been a part of this package for a while but weren't actually able to be used/imported.

  - `<CartCost />`
  - `<CartLinePrice />`
  - `<CartLineProvider />`
  - `useCartLine()`

- 3309706: `<ShopifyProvider />` and `useShop()` have had a breaking update:

  ## `ShopifyProvider`

  - `<ShopifyProvider />` previously accepted a single `shopifyConfig` object as a prop; now, each of the keys in this object are their own separate props.
  - We also removed `country` and `language` as objects, and they are now strings with the names `countryIsoCode` and `languageIsoCode`, respectively.
  - The `locale` prop has been removed completely; this was a duplicative prop that was a combination of `countryIsoCode` and `languageIsoCode`, so it made no sense to have to include it as well.

  An example:

  ```tsx
  // previously:

  <ShopifyProvider
    shopifyConfig={{
      storeDomain: 'my-store',
      storefrontToken: 'abc123',
      storefrontApiVersion: '2022-10',
      country: {
        isoCode: 'CA',
      },
      language: {
        isoCode: 'EN',
      },
      locale: 'EN-CA',
    }}
  >
    {/* rest of your client-side app */}
  </ShopifyProvider>
  ```

  ```tsx
  // now

  <ShopifyProvider
    storeDomain="my-store"
    storefrontToken="abc123"
    storefrontApiVersion="2022-10"
    countryIsoCode="CA"
    languageIsoCode="EN"
  >
    {/* rest of your client-side app */}
  </ShopifyProvider>
  ```

  ## `useShop()`

  As noted above, `locale` was removed from the `<ShopifyProvider />` component, and `countryIsoCode` and `languageIsoCode` were renamed. Here's an example of how the return value of `useShop()` was affected

  ```tsx
  // before

  const {country, language, locale} = useShop();

  console.log(country.isoCode);
  console.log(language.isoCode);
  console.log(locale);
  ```

  ```tsx
  // after

  const {countryIsoCode, languageIsoCode} = useShop();

  console.log(countryIsoCode);
  console.log(languageIsoCode);
  console.log(`${languageIsoCode}-${countryIsoCode}`);
  ```

  Note that `locale` can be replicated by combining `languageIsoCode` and `countryIsoCode` with a hypthen (`-`) between them.

## 2023.1.3

### Patch Changes

- 736cc41: In the version 2023.1.1 "Breaking Changes" section, we said

  > The storefront client and ShopifyProvider now provide the `storeDomain` exactly as it is received; it's recommended that you pass the domain with the protocol and the fully-qualified domain name for your Storefront. For example: `https://hydrogen-test.myshopify.com`

  Unfortunately, the Storefront Client wasn't fully updated to actually do that. This update corrects this bug, but also means that you need to provide a full URL to your Storefront Domain (as was originally intended in our breaking change update).

## 2023.1.2

### Patch Changes

- 16b6b81: Shopify Analytics

  Methods:

  - `useShopifyCookies(hasUserConsent = true, domain = ''): void` - sets and refreshes Shopify cookies
  - `getShopifyCookie(cookieString: string): ShopifyCookie` - returns Shopify cookies
  - `sendShopifyAnalytics({eventName: AnalyticsEventName, payload: ShopifyAnalytics}, domain?): Promise<void>` - sends Shopify analytics
  - `getClientBrowserParameters(): ClientBrowserParameters` - returns commonly tracked client browser values

  Constants:

  - `AnalyticsEventName` - list of Shopify accepted analytics events
  - `AnalyticsPageType` - list of Shopify accepted page type names
  - `ShopifyAppSource` - list of Shopify accepted application source

  Types:

  - `ShopifyCookies`
  - `ClientBrowserParameters`
  - `ShopifyAnalytics` - generic type for `ShopifyPageView` and `ShopifyAddToCart`
  - `ShopifyAnalyticsPayload` - generic type for `ShopifyPageViewPayload` and `ShopifyAddToCartPayload`
  - `ShopifyPageView`
  - `ShopifyPageViewPayload`
  - `ShopifyAddToCart`
  - `ShopifyAddToCartPayload`
  - `ShopifyAnalyticsProduct`

## 2023.1.1

### Changes

- 9bff83c: Updated to Storefront API version `2023-01`

  ## Storefront API Changes

  The Storefront API changelog can be viewed [here](https://shopify.dev/api/release-notes/2023-01#graphql-storefront-api-changes). There are not any breaking changes in the Storefront API itself.

  ## Hydrogen React changes

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
