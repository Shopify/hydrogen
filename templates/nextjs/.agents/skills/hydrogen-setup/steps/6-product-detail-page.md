# Product Detail Page

Create a server-rendered product detail route with a variant picker and image.

## Route And Data

- Use the app's existing product route convention when present; otherwise create `/products/{handle}`.
- Fetch the product by handle in the framework's server data-loading boundary.
- Derive URL-selected options with `getSelectedProductOptions` and pass them as `$selectedOptions` to the product query.
- Start from the sample query below. Extend it for UI needs (extra media, SEO fields, related products). Keep one reusable `VariantFields` fragment shared by `firstSelectableVariant`, `selectedOrFirstAvailableVariant`, and `adjacentVariants` so `selectedVariant` always has the fields the UI needs after option selection.
- After writing or changing the product query, run the `hydrogen-storefront-client` skill's headless query validation check. Do not rely on TypeScript alone to catch invalid Storefront API fields.
- Check GraphQL `errors` before checking `data.product`. If the query returns errors, log them in the server console and return a 500 response. Return a 404 only when the query has no GraphQL errors and `data.product` is missing.

### `getSelectedProductOptions`

Treat each search param as an option name/value pair (`?Color=Red&Size=M` → `[{name:"Color",value:"Red"},{name:"Size",value:"M"}]`). Pass the result into the Storefront API query.

```ts
import { getSelectedProductOptions } from "@shopify/hydrogen";

const selectedOptions = getSelectedProductOptions({
  searchParams: new URL(request.url).searchParams,
});

// Optional: ignore non-option params (utm, ref, etc.) once option names are known
const selectedOptions = getSelectedProductOptions({
  searchParams,
  allowedOptionNames: product.options.map((option) => option.name),
});
```

Passing `allowedOptionNames: []` filters out every option.

### Minimum product query

Extend and adjust fields as the UI needs them.

```ts
import { gql, type StorefrontApi } from "@shopify/hydrogen";

export const VARIANT_FIELDS_FRAGMENT = gql(`
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    selectedOptions {
      name
      value
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      url
      altText
      width
      height
    }
    product {
      title
      handle
    }
    sku
  }
`);

export const PRODUCT_QUERY = gql(
  `
  query Product(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      description
      descriptionHtml
      requiresSellingPlan
      options {
        name
        optionValues {
          name
          firstSelectableVariant {
            ...VariantFields
          }
          swatch {
            color
            image {
              ... on MediaImage {
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
      encodedVariantExistence
      encodedVariantAvailability
      selectedOrFirstAvailableVariant(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...VariantFields
      }
      adjacentVariants(
        selectedOptions: $selectedOptions
        ignoreUnknownOptions: true
        caseInsensitiveMatch: true
      ) {
        ...VariantFields
      }
      media(first: 8) {
        nodes {
          __typename
          id
          mediaContentType
          alt
          ... on MediaImage {
            image {
              url
              altText
              width
              height
            }
          }
          previewImage {
            url
            altText
            width
            height
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`,
  [VARIANT_FIELDS_FRAGMENT],
);

export type ProductData = NonNullable<StorefrontApi.ResultOf<typeof PRODUCT_QUERY>["product"]>;
```

### Example data fetching

```ts
const selectedOptions = getSelectedProductOptions({
  searchParams: new URL(request.url).searchParams,
});

const { data, errors } = await storefrontClient.graphql(PRODUCT_QUERY, {
  variables: { handle, selectedOptions },
});

if (errors) {
  console.error("[hydrogen] Product query failed", errors);
  throw new Response("Product query failed", { status: 500 });
}

if (!data?.product) {
  throw new Response("Product not found", { status: 404 });
}
```

## UI

- You must invoke the `hydrogen-variant-form` skill for option controls, add-to-cart form structure, URL selection, combined listings, price display, disabled states, sold-out states, cart error display, and user acceptance tests. Do not duplicate its rules or invent separate variant matrix logic.
- When the cart drawer is configured with the canonical anchor trigger, follow the `hydrogen-cart-drawer` skill's guidance and open optimistic state via `formProps({ beforeSubmit: openCartDrawer })`; the samples below use `beforeSubmit`.
- Product route loaders and server helpers may read env indirectly through server-only client/config modules. Product client components must not read `process.env`, `import.meta.env`, or framework env modules.

### React

Create typed bindings once from `@shopify/hydrogen/react`:

```ts
// lib/product.ts
import { createProductComponents } from "@shopify/hydrogen/react";
import type { ProductData } from "./product-query";

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<ProductData>();
```

Wrap the purchase UI in `ProductProvider`. Put same-product URL navigation in `onSelect`, not inside each option control:

```tsx
import { ProductProvider, useProductForm } from "~/lib/product";

export function ProductDetails({ product }: { product: ProductData }) {
  const navigate = useNavigate(); // or Next.js router.replace

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        const targetHandle =
          result.selectedVariant?.product?.handle ?? product.handle;
        void navigate(variantUrl(targetHandle, result.selectedOptions), {
          replace: true,
          preventScrollReset: true,
        });
      }}
    >
      <ProductPurchasePanel product={product} />
    </ProductProvider>
  );
}
```

`useProduct` is for read-only selection state (price, gallery, analytics). `useProductForm` adds form bindings (`register`, `formProps`, `pending`):

```tsx
function ProductPrice({ product }: { product: ProductData }) {
  const { selectedVariant } = useProduct();
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  return <p>{formatPrice(price)}</p>;
}

function ProductPurchasePanel({ product }: { product: ProductData }) {
  const { options, selectedVariant, formProps, register, errors } =
    useProductForm();
  const addable = canAddToCart(product, options);

  return (
    <>
      {/* Option controls: see hydrogen-variant-form + its React reference */}
      <form {...formProps({ beforeSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <input {...register("quantity", { defaultValue: 1 })} />
        <button {...register("addToCart", {})} disabled={!addable}>
          {addable
            ? "Add to cart"
            : selectedVariant
              ? "Sold out"
              : "Select options"}
        </button>
      </form>
      {errors.userErrors.length > 0 ? (
        <ul role="alert">
          {errors.userErrors.map((error, index) => (
            <li key={index}>{error.message}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
```

Framework notes:

- Next.js App Router: fetch in the server page; put `ProductProvider` and the form in a `"use client"` component. Use `router.replace(url, { scroll: false })` in `onSelect`.
- React Router: put URL sync in provider `onSelect`. Same-product option values are GET `<Link>`s that spread `register("optionValue", ...)` (no-JS fallback). Cross-product values use `<Link preventScrollReset>`. See the `hydrogen-variant-form` React reference.

### Vue

Create typed bindings once from `@shopify/hydrogen/vue`:

```ts
// storefront/product.ts
import { createProductComponents } from "@shopify/hydrogen/vue";
import type { ProductData } from "./product-types";

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<ProductData>();
```

Wrap the page (or purchase panel) in `ProductProvider`. Sync the URL from `onSelect`:

```vue
<script setup lang="ts">
import { ProductProvider, type ProductData } from "~/storefront/product";

const props = defineProps<{ product: ProductData }>();
const router = useRouter();
const route = useRoute();

function handleSelect(result: {
  selectedOptions: { name: string; value: string }[];
  selectedVariant: { product?: { handle: string } | null } | null;
}) {
  const targetHandle =
    result.selectedVariant?.product?.handle ?? props.product.handle;
  const query = { ...route.query };
  for (const option of props.product.options) delete query[option.name];
  for (const option of result.selectedOptions) {
    query[option.name] = option.value;
  }
  router.replace({ path: `/products/${targetHandle}`, query });
}
</script>

<template>
  <ProductProvider :product="product" :on-select="handleSelect">
    <ProductPurchasePanel :product="product" />
  </ProductProvider>
</template>
```

`useProduct` for read-only state; `useProductForm` for form bindings. Do not destructure the Vue composable return values — keep the object so getters stay reactive:

```vue
<script setup lang="ts">
import { canAddToCart } from "@shopify/hydrogen";
import {
  useProduct,
  useProductForm,
  type ProductData,
} from "~/storefront/product";
import { openCartDrawer } from "~/storefront/cart-drawer";

const props = defineProps<{ product: ProductData }>();

const productState = useProduct();
const form = useProductForm();
const addable = computed(() => canAddToCart(props.product, form.options));
</script>

<template>
  <p>
    {{
      formatMoney(
        productState.selectedVariant?.price ??
          product.priceRange.minVariantPrice,
      )
    }}
  </p>

  <!-- Option controls: see hydrogen-variant-form + its Nuxt/Vue reference -->

  <form v-bind="form.formProps({ beforeSubmit: openCartDrawer })">
    <input type="hidden" v-bind="form.register('merchandiseId', {})" />
    <input v-bind="form.register('quantity', { defaultValue: 1 })" />
    <button
      v-bind="form.register('addToCart', {})"
      :disabled="!addable || form.pending.value"
    >
      {{
        addable
          ? "Add to cart"
          : form.selectedVariant
            ? "Sold out"
            : "Select options"
      }}
    </button>
  </form>
</template>
```

Same-product option values should be `NuxtLink` (or the app's link component) GET links that `v-bind` `form.register('optionValue', ...)`. Cross-product combined-listing values navigate to the other product. See the `hydrogen-variant-form` Nuxt reference.

### Other Framework Gotchas

- SvelteKit: if using the core store directly, create it once, hydrate on product identity changes, and destroy it on unmount.
- Astro: only build this route when the app has server output or a server adapter. Put the interactive product form in a hydrated island or client script that owns the store lifecycle.
- SolidStart: manage the core store lifecycle inside the client component unless a local binding already exists.

## Continue when

- [ ] Directly loading `/products/{handle}` renders product data and a selected or first available variant when one exists
- [ ] Option values render as interactive elements (links/buttons)
- [ ] Clicking an option value in the browser changes the selected variant and the URL
- [ ] Adding a product to cart opens the cart drawer and shows the product in the cart
- [ ] An invalid or failing product query (e.g.: invalid field) logs the GraphQL error server-side and returns 500, not 404
- [ ] A valid query for a missing product returns 404
- [ ] Selecting a variant and refreshing the page persists the same variant selected
- [ ] With javascript disabled, clicking on a variant option navigates to the selected variant
- [ ] Cross-product option values use the framework's client-side link component when the app has one.
- [ ] The product variants form passes the `hydrogen-variant-form` skill's user acceptance tests.
