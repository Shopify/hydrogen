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

Same-product option values are GET links so selection works without JavaScript (the skill's GET-links rule and accessibility guidance cover the `aria-current`, idempotent-`onSelect`, and no-JS rationale). The `to` is the option URL built from `value.selectedOptions`; spreading the registered handlers enhances the link so a hydrated click selects client-side through the provider's `onSelect`. Keep sold-out-but-existing values interactive and derive their visual treatment from `value.available`:

```tsx
<Link
  to={toRouterLocation(variantUrl(product, value.selectedOptions, value.handle))}
  replace
  preventScrollReset
  aria-current={value.selected ? "true" : undefined}
  data-available={value.available ? "true" : "false"}
  {...register("optionValue", { optionName: option.name, value: value.name })}
>
  {value.name}
  {!value.available ? <span className="sr-only"> (Sold out)</span> : null}
</Link>
```

Non-existent combinations (`exists: false`) render as a disabled `<button>` instead of a `<Link>`:

```tsx
<button type="button" disabled aria-pressed={value.selected}>
  {value.name}
</button>
```

Cross-product option values are framework links that reuse the same URL helper:

```tsx
<Link
  to={toRouterLocation(variantUrl(product, value.selectedOptions, value.handle))}
  preventScrollReset
  data-available={value.available ? "true" : "false"}
>
  {value.name}
  {!value.available ? <span className="sr-only"> (Sold out)</span> : null}
</Link>
```
