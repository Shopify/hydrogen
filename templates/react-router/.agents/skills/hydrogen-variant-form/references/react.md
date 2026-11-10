# React Router Product Bindings

This reference uses React Router (`Link`, `useNavigate`, `useLocation`). For Next.js App Router, read `nextjs.md`.

Create typed React product bindings once from `@shopify/hydrogen/react`, usually in a shared product module:

```ts
import { createProductComponents } from "@shopify/hydrogen/react";
import type { ProductData } from "./types";

export const { ProductProvider, useProductForm } =
  createProductComponents<ProductData>();
```

Use the provider's `onSelect` callback for same-product URL sync. Pass the current search params as the `variantUrl` base, so the URL keeps unrelated params and matches the option link `to`:

```tsx
const navigate = useNavigate();
const location = useLocation();

<ProductProvider
  product={product}
  onSelect={(result) => {
    void navigate(
      toRouterLocation(
        variantUrl(
          product,
          result.selectedOptions,
          result.selectedVariant?.product?.handle,
          new URLSearchParams(location.search),
        ),
      ),
      {
        replace: true,
        preventScrollReset: true,
        // Optional: skip loader revalidation when the variant resolved locally.
        ...(result.status === "resolved" ? { defaultShouldRevalidate: false } : {}),
      },
    );
  }}
>
  <ProductPurchasePanel product={product} />
</ProductProvider>
```

`variantUrl(product, selectedOptions, handle, base)` calls `buildProductSelectionSearchParams` with the product option names and `base`, then returns `/products/{handle}?{params}`; `handle` defaults to `product.handle`.

`defaultShouldRevalidate: false` is optional. Use it only for `resolved` selections, only when no other UI on the route needs fresh loader data, and only if the installed React Router supports it. Leave it out for `unresolved` selections, so the loader resolves the exact variant. A route `shouldRevalidate` export still makes the final decision.

Same-product option values are GET links so selection works without JavaScript. The `to` is the option URL built from `value.selectedOptions` with the same base as `onSelect`. Do not spread the registration onto `Link`. Pass a guarded `onClick` instead: for a plain primary click it calls `event.preventDefault()` and then `registered.onClick()`. React Router's `Link` does not navigate when the event is already prevented, so the provider `onSelect` is the only navigation. Other clicks keep native link behavior. Keep sold-out-but-existing values interactive and derive their visual treatment from `value.available`:

```tsx
const location = useLocation();
const baseParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

const registered = register("optionValue", { optionName: option.name, value: value.name });
const onSelectLink = (event: MouseEvent<HTMLAnchorElement>) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    (event.currentTarget.target && event.currentTarget.target !== "_self")
  ) {
    return;
  }

  // The provider owns URL sync; stop Link from navigating a second time.
  event.preventDefault();
  registered.onClick();
};

<Link
  to={toRouterLocation(variantUrl(product, value.selectedOptions, value.handle, baseParams))}
  replace
  preventScrollReset
  aria-current={value.selected ? "true" : undefined}
  data-available={value.available ? "true" : "false"}
  onClick={onSelectLink}
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

Cross-product option values are framework links that reuse the same URL helper and base. They do not call the registered handler. Rendering them as `<Link>` like the same-product values is what keeps focus across the switch. React Router keeps the route component mounted when only `:handle` changes, so React reconciles the activated link in place. A cross-product `<Link>` next to a same-product `<button>` would change element type on the activated control after the navigation, React would remount it, and focus would drop to `<body>`.

```tsx
<Link
  to={toRouterLocation(variantUrl(product, value.selectedOptions, value.handle, baseParams))}
  preventScrollReset
  data-available={value.available ? "true" : "false"}
>
  {value.name}
  {!value.available ? <span className="sr-only"> (Sold out)</span> : null}
</Link>
```
