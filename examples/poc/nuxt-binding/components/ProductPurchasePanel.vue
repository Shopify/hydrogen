<script setup lang="ts">
import { formatMoney } from "~/storefront/money";
import { useProductForm, type ProductData } from "~/storefront/product";

defineProps<{ product: ProductData }>();

const form = useProductForm();
</script>

<template>
  <aside class="md:sticky md:top-8 md:self-start">
    <h1 class="text-4xl font-black tracking-tight">
      {{ product.title }}
    </h1>
    <p class="mt-3 text-lg font-semibold">
      {{ formatMoney(form.selectedVariant?.price ?? product.priceRange.minVariantPrice) }}
    </p>

    <hr class="my-8 border-black/10" />

    <ProductVariantSelector :product="product" />
    <ProductAddToCart :product="product" />

    <p v-if="product.description" class="mt-8 text-sm leading-relaxed text-black/70">
      {{ product.description }}
    </p>
  </aside>
</template>
