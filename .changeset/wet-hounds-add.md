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
