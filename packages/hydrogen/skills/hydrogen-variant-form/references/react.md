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

Same-product option values are GET links so selection works without JavaScript (the skill's GET-links rule and accessibility guidance cover the `aria-current` and no-JS rationale). The `to` is the option URL built from `value.selectedOptions`. On a plain primary click, call the registered `onClick` and then `event.preventDefault()`. React Router's `Link` skips its own navigation when the event is already default-prevented, so the provider's `onSelect` performs the only navigation and a resolved selection issues no loader request. Leave modified clicks alone: `Link` already hands those to the browser, and running the handler there would also change the current page. Keep sold-out-but-existing values interactive and derive their visual treatment from `value.available`:

```tsx
const registered = register("optionValue", { optionName: option.name, value: value.name });

<Link
  to={toRouterLocation(variantUrl(product, value.selectedOptions, value.handle))}
  preventScrollReset
  aria-current={value.selected ? "true" : undefined}
  data-available={value.available ? "true" : "false"}
  onClick={(event) => {
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
    registered.onClick();
    event.preventDefault();
  }}
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
