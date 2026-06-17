# React Product Bindings

Create typed React product bindings once from `@shopify/hydrogen/react`, usually in a shared product module:

```ts
import { createProductComponents } from "@shopify/hydrogen/react";
import type { ProductData } from "./types";

export const { ProductProvider, useProductForm } =
  createProductComponents<ProductData>();
```

Use the provider's `onSelect` callback for same-product URL sync:

```tsx
<ProductProvider
  product={product}
  onSelect={(result) => {
    void navigate(
      toRouterLocation(
        variantUrl(product, result.selectedOptions, result.selectedVariant?.product?.handle),
      ),
      {
        replace: true,
        preventScrollReset: true,
      },
    );
  }}
>
  <ProductPurchasePanel product={product} />
</ProductProvider>
```

If a route should skip loader revalidation for locally resolved selections, use the framework's supported route-level revalidation API. Do not pass unsupported revalidation flags to `navigate()`.

Same-product option values are buttons that spread the registered handlers directly:

```tsx
<button
  type="button"
  aria-pressed={value.selected}
  disabled={!value.exists}
  {...register("optionValue", { optionName: option.name, value: value.name })}
>
  {value.name}
</button>
```

Cross-product option values are framework links that reuse the same URL helper:

```tsx
<Link
  to={toRouterLocation(variantUrl(product, value.selectedOptions, value.handle))}
  preventScrollReset
>
  {value.name}
</Link>
```
