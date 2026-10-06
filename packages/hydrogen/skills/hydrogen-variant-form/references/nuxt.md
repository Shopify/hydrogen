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

Wrap the UI. The provider `onSelect` is the only client navigation for same-product selection; use `router.replace` from `useRouter()`:

```vue
<script setup lang="ts">
import type { ValidProductSelectionResult } from "@shopify/hydrogen/vue";
import { ProductProvider } from "~/storefront/product";
import type { ProductData } from "~/storefront/product-types";

const router = useRouter();

function handleSelect(result: ValidProductSelectionResult<ProductData>) {
  router.replace(variantRoute(result.selectedOptions, result.selectedVariant?.product?.handle));
}
</script>

<template>
  <ProductProvider :product="product" :on-select="handleSelect">
    <ProductVariantSelector :product="product" />
    <ProductAddToCart :product="product" />
  </ProductProvider>
</template>
```

## Variant Selector

Same-product option values are GET links so selection degrades without JavaScript; non-existent combinations render as a disabled `<button>`, and cross-product combined-listing values are normal `NuxtLink` links. See the skill's GET-links and Accessibility rules for the no-JS fallback and `aria-current`, and its "provider `onSelect` is the only client navigation" rule for `onSelect`.

For existing same-product values, use `NuxtLink` with `custom` and render the anchor yourself from the slot `href`. Put a guarded `@click` on that anchor: for a plain primary click it calls `event.preventDefault()` and then `onClick()` from `form.register("optionValue", ...)`, so the provider `onSelect` is the only navigation. Other clicks keep native link behavior. Do not call the slot `navigate`. Do not put `@click` on a regular `NuxtLink` to cancel its navigation, and do not `v-bind` the registration onto it; the order of your listener and the link's own navigation is not something to rely on.

This custom-link guard has not been verified in a running Nuxt storefront. Check plain-click, modified-click, and no-JavaScript behavior in your app before treating this path as verified.

```vue
<script setup lang="ts">
const form = useProductForm();

function handleOptionClick(event: MouseEvent, optionName: string, value: string) {
  const anchor = event.currentTarget;
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(anchor instanceof HTMLAnchorElement) ||
    (anchor.target !== "" && anchor.target.toLowerCase() !== "_self") ||
    anchor.hasAttribute("download")
  ) {
    return;
  }

  // The provider owns URL sync; stop the anchor from navigating too.
  event.preventDefault();
  const registered = form.register("optionValue", { optionName, value });
  registered.onClick();
}
</script>

<template>
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

  <!-- same-product, existing value: GET link with a guarded click -->
  <NuxtLink
    v-else
    v-slot="{ href }"
    :to="variantRoute(value.selectedOptions)"
    custom
  >
    <a
      :href="href"
      :aria-current="value.selected ? 'true' : undefined"
      @click="handleOptionClick($event, option.name, value.name)"
    >
      {{ value.name }}
      <template v-if="!value.available"> - Sold out</template>
    </a>
  </NuxtLink>
</template>
```

`variantRoute(selectedOptions, handle)` returns `{ path, query }`. Build the query with `buildProductSelectionSearchParams`, passing the product option names as `optionNames`. Convert Nuxt's current route query to `URLSearchParams` for `base` by appending every scalar or array value, then convert the returned params back to a Nuxt query object while preserving repeated keys. Use the current route query as `base` both for link `href` values and for `onSelect`. This preserves non-option params while removing stale option params and the reserved `variant` param.

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
