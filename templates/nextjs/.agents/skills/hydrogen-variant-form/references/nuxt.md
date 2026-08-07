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

In `pages/products/[handle].vue`, pass selected options from `getSelectedProductOptions({searchParams})` into the Storefront API query. Use one reusable variant fragment for `firstSelectableVariant`, `selectedOrFirstAvailableVariant`, and `adjacentVariants`; it must include variant `price`, `availableForSale`, `selectedOptions`, and `product { handle title }` so price display and combined-listing navigation work. Use the injected server/client Storefront client from the Nuxt storefront-client recipe.

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

Same-product option values are GET links (`NuxtLink`) so selection degrades without JavaScript; non-existent combinations render as a disabled `<button>`, and cross-product combined-listing values are also links. The skill's GET-links rule and accessibility guidance cover the `aria-current`, idempotent-`onSelect`, and no-JS rationale:

```vue
<!-- cross-product: navigate to a different product -->
<NuxtLink
  v-if="value.handle !== product.handle"
  :to="variantRoute(value.selectedOptions, value.handle)"
  replace
>
  {{ value.name }}
</NuxtLink>

<!-- same-product, non-existent combination: no option URL to degrade to -->
<button
  v-else-if="!value.exists"
  type="button"
  disabled
  :aria-pressed="value.selected"
>
  {{ value.name }}
</button>

<!-- same-product, existing value: GET link enhanced by the registered handler -->
<NuxtLink
  v-else
  :to="variantRoute(value.selectedOptions, value.handle)"
  replace
  :aria-current="value.selected ? 'true' : undefined"
  v-bind="form.register('optionValue', { optionName: option.name, value: value.name })"
>
  {{ value.name }}
  <template v-if="!value.available"> - Sold out</template>
</NuxtLink>
```

Build route query objects by copying `route.query`, deleting all product option names, then setting selected option values. This preserves non-option params.

## Add To Cart

```vue
<form v-bind="form.formProps({ beforeSubmit: openCartDrawer })">
  <input type="hidden" v-bind="form.register('merchandiseId', {})" />
  <input v-bind="form.register('quantity', { value: quantity })" />
  <button v-bind="form.register('addToCart', {})" :disabled="!addable || form.pending.value">
    Add to cart
  </button>
</form>
```

`addable` must use `canAddToCart(product, form.options)`.

Use the local `hydrogen-shop-pay` skill for Shop Pay and `hydrogen-money` for price formatting.
