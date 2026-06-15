# Vue Cart Bindings

For Vue and Nuxt apps, derive cart bindings once from the cart server handlers. Do not hand-roll cart state with `ref`, `reactive`, custom fetchers, or bespoke optimistic reducers unless the app is not using Vue.

```ts
// app/lib/cart-handlers.ts
import { createCartServerHandlers } from "@shopify/hydrogen";

export const cartHandlers = createCartServerHandlers();
```

```ts
// app/lib/cart.ts
import { createCartComponents } from "@shopify/hydrogen/vue";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartForm } =
  createCartComponents<typeof cartHandlers>();
```

## Root Setup

Wrap the app in `<CartProvider>`. In Nuxt, this usually belongs in `app.vue` or a shared layout:

```vue
<script setup lang="ts">
import { CartProvider } from "~/lib/cart";
</script>

<template>
  <CartProvider>
    <NuxtPage />
  </CartProvider>
</template>
```

If the framework can fetch cart data on the server, pass `initialData` into `<CartProvider>`. If there is no server cart fetch yet, still wrap with `<CartProvider>`; it will fetch `/api/cart` after mount. Register `createCartServerHandlers()` with `handleShopifyRoutes({ handlers: [cartHandlers] })` so that route exists.

## Custom Cart Fields

If the cart needs extra fields, pass `fragment` with a fragment named `CartFragment` to `createCartServerHandlers()` and derive typed Vue bindings from the handlers:

```ts
// app/lib/cart-handlers.ts
import { gql } from "@shopify/hydrogen";
import { createCartServerHandlers } from "@shopify/hydrogen";

const cartFragment = gql(`
  fragment CartFragment on Cart {
    lines(first: 250) {
      nodes {
        merchandise {
          ... on ProductVariant {
            currentlyNotInStock
          }
        }
      }
    }
  }
`);

export const cartHandlers = createCartServerHandlers({
  fragment: cartFragment,
});
```

```ts
// app/lib/cart.ts
import { createCartComponents } from "@shopify/hydrogen/vue";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartForm } =
  createCartComponents<typeof cartHandlers>();
```

```vue
<script setup lang="ts">
import { useCart } from "~/lib/cart";

const lines = useCart((state) => state.data.lines.nodes);
</script>

<template>
  <ul>
    <li v-for="line in lines" :key="line.id">
      <span>{{ line.merchandise?.product.title }}</span>
      <span v-if="line.merchandise?.currentlyNotInStock">Backordered</span>
    </li>
  </ul>
</template>
```

## Product Fields That Fit Cart Lines

Product handlers should use the same cart handler value that defines cart line merchandise. This lets TypeScript reject product fragments whose selected variant cannot be used as optimistic cart line merchandise, while preserving extra product fields for product components.

```ts
// app/lib/product-handlers.ts
import { gql, createProductServerHandlers } from "@shopify/hydrogen";

import { cartHandlers } from "./cart-handlers";

const productFragment = gql(`
  fragment ProductFragment on Product {
    description
    options {
      optionValues {
        firstSelectableVariant {
          currentlyNotInStock
        }
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      currentlyNotInStock
    }
    adjacentVariants(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      currentlyNotInStock
    }
  }
`);

export const productHandlers = createProductServerHandlers({
  cartHandlers,
  fragment: productFragment,
});
```

```ts
// app/lib/product.ts
import { createProductComponents } from "@shopify/hydrogen/vue";

import type { productHandlers } from "./product-handlers";

export const { ProductProvider, useProduct, useProductForm } =
  createProductComponents<typeof productHandlers>();
```

```vue
<script setup lang="ts">
import { useProduct } from "~/lib/product";

const product = useProduct();
</script>

<template>
  <p v-if="product.selectedVariant?.currentlyNotInStock">Backordered</p>
</template>
```

If a cart fragment adds a custom merchandise field that product forms need for optimistic lines, select that field in every product variant source: `selectedOrFirstAvailableVariant`, `adjacentVariants`, and `options.optionValues.firstSelectableVariant`.

`createProductServerHandlers` takes the `cartHandlers` runtime value rather than `typeof cartHandlers` because TypeScript does not support partial inference after one explicit generic parameter. Product and cart handlers live in server modules that typically import both values anyway, so this keeps inference precise without changing the practical server bundle shape.

## Reading Cart State

Use `useCart(selector)` for reactive state. It returns a readonly shallow ref, so read `.value` in `<script setup>` and let templates unwrap it:

```vue
<script setup lang="ts">
import { useCart } from "~/lib/cart";

const totalQuantity = useCart((state) => state.data.totalQuantity);
const lines = useCart((state) => state.data.lines.nodes);
const pendingLines = useCart((state) => state.pending.lines);
const lineErrors = useCart((state) => state.errors.lines);
</script>

<template>
  <NuxtLink to="/cart">Cart {{ totalQuantity }}</NuxtLink>
</template>
```

Use this for the navbar cart count, cart line list, totals, pending state, and scoped errors. Do not mirror selected cart state into local refs; the store already publishes updates.

## Mutating Cart State

Use `useCartForm()` for forms. It returns `formProps()` and `register()` helpers that encode Hydrogen's cart action contract. In Vue templates, apply them with `v-bind`:

```vue
<script setup lang="ts">
import { useCart, useCartForm } from "~/lib/cart";

const pendingLines = useCart((state) => state.pending.lines);
const { formProps, register } = useCartForm();

defineProps<{
  line: { id: string; quantity: number };
}>();
</script>

<template>
  <form v-bind="formProps()">
    <input type="hidden" v-bind="register('lineId', { value: line.id })" />
    <button type="submit" v-bind="register('decrease')">-</button>
    <input
      v-bind="register('quantity', { value: line.quantity })"
      class="transition-opacity"
      :class="pendingLines.has(line.id) ? 'opacity-30' : ''"
    />
    <button type="submit" v-bind="register('increase')">+</button>
    <button type="submit" v-bind="register('remove')">Remove</button>
  </form>
</template>
```

Important Vue form fields:

- `formProps()` wires `method`, `action`, and submit handling to the cart store.
- `register("lineId", { value })` scopes the form to one line.
- `register("quantity", { value })` registers a quantity value.
- `register("increase")`, `register("decrease")`, and `register("remove")` create line item controls.
- `register("discountCode")`, `register("discount-apply")`, and `register("discount-remove")` create discount forms.
- `register("note")` and `register("note-update")` create note forms.

Each line item still gets its own form; the binding removes boilerplate, not the form identity requirement.

## Pending Helpers

`useCartForm()` also exposes `isPending` for common checks:

```ts
const { isPending } = useCartForm();

const isInitialCartLoadPending = isPending.initial;
const isLinePending = isPending.lines(line.id);
```

Prefer `useCart((state) => state.pending...)` when a component already needs broader cart state. Use `isPending` for small form components that only need pending checks.
