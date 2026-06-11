<script setup lang="ts">
import { canAddToCart } from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/vue";

import { openCartDrawer } from "~/storefront/cart-drawer";
import type { ProductData } from "~/storefront/product";
import { useProductForm } from "~/storefront/product";

const props = defineProps<{ product: ProductData }>();

const form = useProductForm();
const quantity = ref(1);

const addable = computed(() => canAddToCart(props.product, form.options));
</script>

<template>
  <div class="mt-8 space-y-2">
    <form v-bind="form.formProps({ afterSubmit: openCartDrawer })" class="flex items-center gap-3">
      <input type="hidden" v-bind="form.register('merchandiseId', {})" />
      <div class="flex h-12 items-center rounded-full border border-black/15">
        <button
          type="button"
          aria-label="Decrease quantity"
          class="grid h-12 w-12 place-items-center text-lg"
          @click="quantity = Math.max(1, quantity - 1)"
        >
          &ndash;
        </button>
        <input
          type="text"
          inputmode="numeric"
          v-bind="form.register('quantity', { value: quantity })"
          class="h-12 w-10 bg-transparent text-center text-sm font-semibold focus:outline-none"
          @input="
            (e) => {
              const next = Number((e.target as HTMLInputElement).value);
              quantity = Number.isFinite(next) && next > 0 ? Math.floor(next) : 1;
            }
          "
        />
        <button
          type="button"
          aria-label="Increase quantity"
          class="grid h-12 w-12 place-items-center text-lg"
          @click="quantity++"
        >
          +
        </button>
      </div>
      <button
        type="submit"
        :disabled="!addable || form.pending.value"
        class="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
        {{
          form.pending.value
            ? "Adding…"
            : addable
              ? "Add to cart"
              : form.selectedVariant === null
                ? "Loading…"
                : "Unavailable"
        }}
      </button>
    </form>
    <p v-if="form.errors.userErrors.length > 0" class="text-sm text-red-600">
      {{ form.errors.userErrors[0].message }}
    </p>
    <ShopPayButton
      v-if="form.selectedVariant"
      :variants="[{ id: form.selectedVariant.id, quantity }]"
      channel="headless"
      :disabled="!addable || form.pending.value"
      width="100%"
      height="48px"
      border-radius="9999px"
    />
  </div>
</template>
