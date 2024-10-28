---
'skeleton': patch
'@shopify/hydrogen': patch
---

[**Breaking change**]

Deprecate usages of `product.options.values` and use `product.options.optionValues` instead.

1. Update your product graphql query to use the new `optionValues` field.

```diff
  const PRODUCT_FRAGMENT = `#graphql
    fragment Product on Product {
      id
      title
      options {
        name
-        values
+        optionValues {
+          name
+        }
      }
```

2. Update your `<VariantSelector>` to use the new `optionValues` field.

```diff
  <VariantSelector
    handle={product.handle}
-    options={product.options.filter((option) => option.values.length > 1)}
+    options={product.options.filter((option) => option.optionValues.length > 1)}
    variants={variants}
  >
```
