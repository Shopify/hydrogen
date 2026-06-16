# Nuxt

Use `@shopify/hydrogen/vue` product bindings. Server page data resolves the selected variant from URL query params; client components own option interaction and add-to-cart.

## Storefront Module

```ts
// storefront/product.ts
import { createProductComponents } from "@shopify/hydrogen/vue";
import type { ProductData } from "./product-types";

export const { ProductProvider, useProductForm } = createProductComponents<ProductData>();
```

`ProductData` is app-owned. It must include Hydrogen's product form fields: `id`, `handle`, `title`, `options`, `selectedOrFirstAvailableVariant`, `adjacentVariants`, `encodedVariantExistence`, `encodedVariantAvailability`, `requiresSellingPlan`, and variant `price`/`availableForSale` fields used by the UI.

Wrap this tree in the app's `CartProvider` from `hydrogen-cart-ui`; `ProductProvider` reads the cart store for add-to-cart submission and product-scoped cart errors.

## Page

In `pages/products/[handle].vue`, pass selected options from `getSelectedProductOptions(...)` into the Storefront API query. Use one reusable variant fragment for `firstSelectableVariant`, `selectedOrFirstAvailableVariant`, and `adjacentVariants`; it must include variant `price`, `availableForSale`, `selectedOptions`, and `product { handle title }` so price display and combined-listing navigation work. Use the injected server/client Storefront client from the Nuxt storefront-client recipe.

Wrap the UI:

```vue
<template>
  <ProductProvider
    :product="product"
    :on-select="
      (result) =>
        navigateTo(variantRoute(result.selectedOptions, result.selectedVariant?.product?.handle), {
          replace: true,
        })
    "
  >
    <ProductVariantSelector :product="product" />
    <ProductAddToCart :product="product" />
  </ProductProvider>
</template>
```

## Variant Selector

Use `NuxtLink` for cross-product combined-listing values and buttons for same-product values:

```vue
<NuxtLink
  v-if="value.handle !== product.handle"
  :to="variantRoute(value.selectedOptions, value.handle)"
  replace
>
  {{ value.name }}
</NuxtLink>

<button
  v-else
  type="button"
  :aria-pressed="value.selected"
  :disabled="!value.exists"
  v-bind="form.register('optionValue', { optionName: option.name, value: value.name })"
>
  {{ value.name }}
  <template v-if="value.exists && !value.available"> - Sold out</template>
</button>
```

Build route query objects by copying `route.query`, deleting all product option names, then setting selected option values. This preserves non-option params.

## Add To Cart

```vue
<form v-bind="form.formProps({ afterSubmit: openCartDrawer })">
  <input type="hidden" v-bind="form.register('merchandiseId', {})" />
  <input v-bind="form.register('quantity', { value: quantity })" />
  <button type="submit" :disabled="!addable || form.pending.value">Add to cart</button>
</form>
```

`addable` must use `canAddToCart(product, form.options)`.

Use the local `hydrogen-shop-pay` skill for Shop Pay and `hydrogen-money` for price formatting.
