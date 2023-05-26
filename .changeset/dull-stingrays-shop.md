---
'demo-store': patch
---

Start using GraphQL code generation. This allows us to have full-stack type-safety and better developer experience.

As a result of the above, we've fixed issues where the frontend was accessing data that was not correctly fetched from the Storefront API. For example, missing `product.vendor` or accessing `totalPrice` instead of `totalPriceV2`.

To enable the unstable codegen feature in your project, run your dev command as `shopify hydrogen dev --codegen-unstable`. See the [changes associated here](https://github.com/Shopify/hydrogen/pull/937/files) for examples.
