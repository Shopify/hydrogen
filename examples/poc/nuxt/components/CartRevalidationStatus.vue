<script setup lang="ts">
import { useCart } from "~/storefront/cart";

const message = useCart((state) => {
  const pending =
    state.pending.lines.size > 0 ||
    state.pending.discountCodes.size > 0 ||
    state.revalidating === true;
  if (pending) return "Updating cart totals";
  return state.errors.network.length === 0 ? "Cart totals updated" : "";
});
</script>

<template>
  <span role="status" class="sr-only">{{ message }}</span>
</template>
