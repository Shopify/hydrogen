---
'skeleton': patch
---

Use new parameters introduced in Storefront API v2024-01 to fix redirection to the product's default variant when there are unknown query params in the URL.

```diff
-   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
+   selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
```
