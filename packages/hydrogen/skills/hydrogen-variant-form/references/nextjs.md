# Next.js App Router

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
  const selectedOptions = getSelectedProductOptions(
    toURLSearchParams(await searchParams),
  );
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

Same-product values use `register("optionValue", ...)`. Cross-product combined-listing values must navigate to the target handle. If using a button for cross-product navigation, keep it clearly outside the form and call `router.replace(...)`; otherwise prefer `next/link` when the app expects link semantics.

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

Do not put option controls inside the add-to-cart form. The form contains `merchandiseId` and `quantity`; option controls are buttons/links outside it.
