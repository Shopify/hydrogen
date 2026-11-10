# Next.js App Router

## Contents

- Server Page
- Client Details Component
- Same-Product And Cross-Product Values
- No-JavaScript Limits
- Add To Cart

Product data is fetched in the server page. Variant selection and add-to-cart live in a `"use client"` component because they use `ProductProvider`, browser routing, and cart forms.

## Server Page

In `app/products/[handle]/page.tsx`, read selected options from URL search params and query Storefront API with Hydrogen's product fields:

```tsx
import { getSelectedProductOptions, gql } from "@shopify/hydrogen";

export const PRODUCT_QUERY = gql(`
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      requiresSellingPlan
      encodedVariantExistence
      encodedVariantAvailability
      options {
        name
        optionValues {
          name
          firstSelectableVariant {
            id
            title
            availableForSale
            selectedOptions { name value }
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            product { handle title }
            sku
          }
          swatch { color image { previewImage { url } } }
        }
      }
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        id
        title
        availableForSale
        selectedOptions { name value }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        product { handle title }
        sku
      }
      adjacentVariants(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        id
        title
        availableForSale
        selectedOptions { name value }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        product { handle title }
        sku
      }
      priceRange {
        minVariantPrice { amount currencyCode }
      }
    }
  }
`);

export default async function ProductPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const selectedOptions = getSelectedProductOptions({
    searchParams: toURLSearchParams(await searchParams),
  });
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(PRODUCT_QUERY, {
    variables: { handle, selectedOptions },
  });
  if (!data?.product) notFound();
  return <ProductDetails product={data.product} />;
}

function toURLSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  return params;
}
```

Use the route's existing search-param normalization helper if present.

## Client Details Component

```tsx
"use client";

import { canAddToCart, type SelectedOption, type StorefrontApi } from "@shopify/hydrogen";
import { createProductComponents } from "@shopify/hydrogen/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PRODUCT_QUERY } from "../products/[handle]/page";

type ProductQuery = StorefrontApi.ResultOf<typeof PRODUCT_QUERY>;
type ProductData = NonNullable<ProductQuery["product"]>;

const { ProductProvider, useProductForm } = createProductComponents<ProductData>();

export function ProductDetails({ product }: { product: ProductData }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        router.replace(
          variantUrl(product, result.selectedOptions, result.selectedVariant?.product?.handle, searchParams),
          { scroll: false },
        );
      }}
    >
      <VariantSelector product={product} />
      <AddToCart product={product} />
    </ProductProvider>
  );
}
```

Wrap this tree in the app's `CartProvider` from `hydrogen-cart-ui`; `ProductProvider` reads the cart store for add-to-cart submission and product-scoped cart errors.

## Same-Product And Cross-Product Values

Render existing same-product option values as GET links (`next/link`) so variant selection degrades without JavaScript (see the skill's GET-links and Accessibility rules for the no-JS fallback and `aria-current`, and its "provider `onSelect` is the only client navigation" rule for `onSelect`). The `href` is the option URL built from `value.selectedOptions`, with the same `searchParams` base as the provider `onSelect`. Do not spread `register("optionValue", ...)` onto `Link`. Use `onNavigate` instead: call `event.preventDefault()` to cancel the `Link` navigation, then call `registered.onClick()` so the provider `onSelect` is the only navigation. Next.js does not call `onNavigate` for modifier-key clicks, a `target` other than `_self`, or links with `download`, so those clicks stay native. Cancel navigation and call the registered handler only on same-product values; cross-product links can use `onNavigate` to record focus as shown below. Keep sold-out-but-existing values interactive and derive their visual treatment from `value.available`. Render non-existent combinations (`exists: false`) as a disabled `<button>` instead of a link.

```tsx
const searchParams = useSearchParams();

<Link
  href={variantUrl(product, value.selectedOptions, value.handle, searchParams)}
  scroll={false}
  ref={(node) => focusIfPending(node, product.handle, option.name, value.name)}
  aria-current={value.selected ? "true" : undefined}
  data-available={value.available ? "true" : "false"}
  onNavigate={(event) => {
    // The provider owns URL sync; stop Link from navigating a second time.
    event.preventDefault();
    const registered = register("optionValue", { optionName: option.name, value: value.name });
    registered.onClick();
  }}
>
  {value.name}
  {!value.available ? <span className="sr-only"> (Sold out)</span> : null}
</Link>
```

Cross-product combined-listing values point at a different `value.handle` and navigate to that product. Render them as a normal `next/link` with `scroll={false}`. Use `onNavigate` only to record focus for the new page, not to select an option or cancel navigation. Both link types use the same URL helper:

```tsx
import { buildProductSelectionSearchParams, type SelectedOption } from "@shopify/hydrogen";

function variantUrl(
  product: { handle: string; options: Array<{ name: string }> },
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base: URLSearchParams | ReturnType<typeof useSearchParams> = new URLSearchParams(),
) {
  const params = buildProductSelectionSearchParams({
    selectedOptions,
    optionNames: product.options.map((option) => option.name),
    base: new URLSearchParams(base),
  });
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}
```

Next.js keys the `[handle]` segment by its value, so a cross-product navigation unmounts the product component and the focused link with it, and `scroll={false}` also turns off the router's own focus handling. Keep focus on the activated value by recording it in module state from the cross-product link's `onNavigate`, which does not fire for a Cmd-click, and focusing its same-product link through a callback `ref` as the new page mounts. Module state outlives the remount. A ref or `useState` inside the component does not.

```tsx
let pendingFocus: { handle: string; optionName: string; value: string } | null = null;

function focusIfPending(node: HTMLAnchorElement | null, handle: string, optionName: string, value: string) {
  if (!node || pendingFocus?.handle !== handle || pendingFocus.optionName !== optionName || pendingFocus.value !== value) return;
  pendingFocus = null;
  node.focus();
}

<Link
  href={variantUrl(product, value.selectedOptions, value.handle, searchParams)}
  scroll={false}
  onNavigate={() => {
    pendingFocus = { handle: value.handle, optionName: option.name, value: value.name };
  }}
  data-available={value.available ? "true" : "false"}
>
  {value.name}
</Link>
```

## No-JavaScript Limits

A valid option `href` does not by itself make the product page render without JavaScript. When product content is inside a `<Suspense>` boundary that streams after the first HTML (for example, a root layout that wraps a dynamic app shell in `<Suspense>`), React reveals the streamed content with an inline script. With JavaScript disabled, the shopper can see only the fallback, even though the server resolved the selected variant. Test the no-JS path in your app. If the product page does not render without JavaScript, record that limit; do not report the no-JS option links as verified.

## Add To Cart

Use the local `hydrogen-shop-pay` skill when adding Shop Pay. Use the local `hydrogen-money` skill for prices.

Do not put option controls inside the add-to-cart form. The form submits `merchandiseId` and `quantity`; option controls are buttons/links outside it. Register the submit button with `addToCart`.

```tsx
function AddToCart({ product }: { product: ProductData }) {
  const { options, register, formProps, pending } = useProductForm();
  const addable = canAddToCart(product, options);

  return (
    <form {...formProps({ beforeSubmit: openCartDrawer })}>
      <input type="hidden" {...register("merchandiseId", {})} />
      <input {...register("quantity", { value: 1 })} />
      <button {...register("addToCart", {})} disabled={!addable || pending}>
        Add to cart
      </button>
    </form>
  );
}
```
