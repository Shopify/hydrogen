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
import { createCartServerHandlers, gql } from "@shopify/hydrogen";

const cartFragment = gql(`
  fragment CartFragment on Cart {
    lines(first: 250) {
      nodes {
        merchandise {
          ... on ProductVariant {
            availableForSale
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
      <img
        v-if="line.merchandise?.image"
        :src="line.merchandise.image.url"
        :alt="line.merchandise.image.altText ?? ''"
      />
      <NuxtLink
        v-if="line.merchandise?.product.handle"
        :to="`/products/${line.merchandise.product.handle}`"
      >
        {{ line.merchandise.product.title }}
      </NuxtLink>
      <span v-else>{{ line.merchandise?.product.title ?? line.merchandise?.title ?? "Product" }}</span>
      <span v-for="option in line.merchandise?.selectedOptions ?? []" :key="option.name">
        {{ option.name }}: {{ option.value }}
      </span>
      <span v-if="line.merchandise?.availableForSale === false">Unavailable</span>
    </li>
  </ul>
</template>
```

Cart line merchandise fields are intentionally tolerant because optimistic lines and custom fragments can differ from a complete Storefront API cart response. Treat `line.merchandise`, `merchandise.selectedOptions`, `merchandise.title`, `merchandise.product.handle`, and `merchandise.image` as optional unless the app's custom cart fragment and types prove otherwise.

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

Use `useCartForm()` for forms. It returns `formProps()` and `register()` helpers that encode Hydrogen's cart action contract. In Vue templates, apply them with `v-bind`.

Line item quantity forms must keep this shape even when the surrounding markup, styling, or component boundaries differ:

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
    <button v-bind="register('set')" />
    <input type="hidden" v-bind="register('lineId', { value: line.id })" />
    <button type="submit" v-bind="register('decrease')">-</button>
    <input
      v-bind="register('quantity', { value: line.quantity, interactive: true })"
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
- `register("set")` renders the hidden default submit control for explicit line quantity updates. Keep it in every line item quantity form so pressing Enter in the quantity input submits the set action.
- `register("lineId", { value })` scopes the form to one line.
- `register("quantity", { value, interactive: true })` wires an editable quantity input for both hydrated and no-JS submissions. Do not replace it with text-only output.
- `register("increase")`, `register("decrease")`, and `register("remove")` create line item controls.
- `register("discountCode", { defaultValue: "" })`, `register("discountCode", { value: code })`, `register("discount-apply")`, and `register("discount-remove")` create discount forms.
- `register("note")` and `register("note-update")` create note forms.

Each line item still gets its own form; the binding removes boilerplate, not the form identity requirement.

If you render the same line items in a cart drawer, share this line item form component with the `/cart` page when possible. If the drawer needs different markup, preserve the same `set` + `lineId` + interactive `quantity` contract.

When wiring less common cart forms, prefer the exact package types over memory. In an installed app, inspect `node_modules/@shopify/hydrogen/dist/index.d.mts` or use editor hover on `CartFormRegister` to confirm which `register(...)` calls require `{ value }` versus `{ defaultValue }`.

## Pending Helpers

`useCartForm()` also exposes `isPending` for common checks:

```ts
const { isPending } = useCartForm();

const isInitialCartLoadPending = isPending.initial;
const isLinePending = isPending.lines(line.id);
```

Prefer `useCart((state) => state.pending...)` when a component already needs broader cart state. Use `isPending` for small form components that only need pending checks.
