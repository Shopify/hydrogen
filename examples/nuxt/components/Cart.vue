<script setup lang="ts">
import { useCart } from "~/storefront/cart";

const loading = useCart((s) => s.loading);
const lines = useCart((s) => s.data.lines.nodes);

const hasCartContent = computed(() => !loading.value && lines.value.length > 0);
</script>

<template>
  <div>
    <CartErrorBanner />
    <CartLineItems />

    <template v-if="hasCartContent">
      <CartTotals />
      <CartDiscountCodes />
      <CartNote />
    </template>
  </div>
</template>
