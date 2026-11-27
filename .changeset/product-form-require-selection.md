---
"@shopify/hydrogen": minor
---

Add a `requireSelection` option to `createProductFormStore`. With `requireSelection: true`, the store starts from the `selectedOptions` you pass and the options that have one value, and leaves the other options unselected, instead of starting from the product's `selectedOrFirstAvailableVariant`. `hydrate()` follows the same policy. Use it when the customer must choose an option such as a size themselves. The Storefront API answers a partial selection, such as `?Size=L` on a product that also has a colour, with the first available variant, so the store preselected a size the customer never chose and the add-to-cart form could submit it. The loaded variants still resolve the selection once every option is chosen. Without the option, nothing changes.
