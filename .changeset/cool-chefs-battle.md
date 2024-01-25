---
'skeleton': patch
---

Use new Storefront API parameters in 2024-01 to fix redirection to the product's default variant when there are unknown query params in the URL.

```diff
-   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
+   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
```
