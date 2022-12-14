---
'@shopify/hydrogen-react': patch
---

Added the `price` and `compareAtPrice` fields to our `defaultCartFragment`, which is used to get the Cart fields in the `<CartProvider />` component.

The above fields should be identical to `priceV2` and `compareAtPriceV2`, with the exception that these `V2` fields are being deprecated in a future version of the Storefront API.

We'll keep both for now, to help deveopers upgrade without issues, and then remove the `V2` versions in a future breaking update.
