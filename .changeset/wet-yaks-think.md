---
'@shopify/hydrogen': patch
---

[**New Features**]

Add a `useOptimisticVariant` hook for optimistically rendering product variant changes. This makes switching product variants instantaneous. Example usage:

```tsx
function Product() {
  const {product, variants} = useLoaderData<typeof loader>();

  // The selectedVariant optimistically changes during page
  // transitions with one of the preloaded product variants
  const selectedVariant = useOptimisticVariant(
    product.selectedVariant,
    variants,
  );

  return <ProductMain selectedVariant={selectedVariant} />;
}
```

This also introduces a small breaking change to the `VariantSelector` component, which now immediately updates which variant is active. If you'd like to retain the current functionality, and have the `VariantSelector` wait for the page navigation to complete before updating, use the `waitForNavigation` prop:

```tsx
<VariantSelector
  handle={product.handle}
  options={product.options}
  waitForNavigation
>
  ...
</VariantSelector>
```
