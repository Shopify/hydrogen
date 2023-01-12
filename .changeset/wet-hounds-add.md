---
'@shopify/hydrogen-react': patch
---

Updated to Storefront API version `2023-01`

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

  - Additionally, a new TypeScript type called `ParsedMetafields` is provided to help the `parseMetafield` function return the correct TypeScript types, by passing the type of metafield into the `ParsedMetafield` type. For example:

    ```ts
    const metafield = parseMetafield<ParsedMetafield['boolean']>(rawMetafield);

    // parsedValue is a boolean
    if (metafield.parsedValue === true) {
    }
    ```

- The `<Metafield/>` component has been removed; use `parseMetafield().parsedValue` to have control over what you want to render

### Other Changes

- The TypeScript types for the returned value of `flattenConnection()` should now be friendlier: if you are using a `PartialDeep` object, you'll still get a `PartialDeep` object in return; if you're NOT using a `PartialDeep` object, then the returned type will not be wrapped in `PartialDeep`.
