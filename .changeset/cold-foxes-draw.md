---
'skeleton': patch
'@shopify/hydrogen': patch
---

**Breaking change**

Previously the `VariantSelector` component would filter out options that only had one value. This is undesireable for some apps. We've removed that filter, if you'd like to retain the existing functionality, simply filter the options prop before it is passed to the `VariantSelector` component:

```diff
 <VariantSelector
   handle={product.handle}
+  options={product.options.filter((option) => option.values.length > 1)}
-  options={product.options}
   variants={variants}>
 </VariantSelector>
```

Fixes [#1198](https://github.com/Shopify/hydrogen/discussions/1198)
