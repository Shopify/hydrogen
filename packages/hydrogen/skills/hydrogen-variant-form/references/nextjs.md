# Next.js App Router

## Contents

- Server Page
- Client Details Component
- Same-Product And Cross-Product Values
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

Render same-product option values as GET links (`next/link`) so variant selection degrades without JavaScript (the skill's GET-links rule and accessibility guidance cover the `aria-current`, idempotent-`onSelect`, and no-JS rationale). The `href` is the option URL built from `value.selectedOptions`; spread `register("optionValue", ...)` to enhance the link so a hydrated click selects client-side via the provider's `onSelect`. Keep sold-out-but-existing values interactive and derive their visual treatment from `value.available`. Render non-existent combinations (`exists: false`) as a disabled `<button>` instead of a link.

```tsx
<Link
  href={variantUrl(product, value.selectedOptions, value.handle, searchParams)}
  replace
  scroll={false}
  aria-current={value.selected ? "true" : undefined}
  data-available={value.available ? "true" : "false"}
  {...register("optionValue", { optionName: option.name, value: value.name })}
>
  {value.name}
  {!value.available ? <span className="sr-only"> (Sold out)</span> : null}
</Link>
```

Cross-product combined-listing values point at a different `value.handle` and navigate to that product. Prefer `next/link`; if using a button for cross-product navigation, keep it clearly outside the add-to-cart form and call `router.replace(...)`. Both use the same URL helper:

```tsx
function variantUrl(
  product: { handle: string; options: Array<{ name: string }> },
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base: URLSearchParams | ReturnType<typeof useSearchParams> = new URLSearchParams(),
) {
  const params = new URLSearchParams(base);
  for (const option of product.options) params.delete(option.name);
  for (const option of selectedOptions) params.set(option.name, option.value);
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}
```

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
