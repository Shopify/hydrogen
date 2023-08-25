---
'@shopify/hydrogen': patch
---

Add custom product paths to the `VariantSelector` component:

```tsx
<VariantSelector handle="snowboard" productPath="shop" options={options}>
  {/* ... */}
</VariantSelector>
```
