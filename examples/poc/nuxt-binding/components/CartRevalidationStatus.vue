<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";

import { useCart } from "~/storefront/cart";

const isPending = useCart((state) => state.pending.cost === true || state.revalidating === true);
const hasNetworkErrors = useCart((state) => state.errors.network.length > 0);
const sawPending = ref(false);

watchEffect(() => {
  if (isPending.value) sawPending.value = true;
});

const message = computed(() => {
  if (isPending.value) return "Updating cart totals";
  if (sawPending.value && !hasNetworkErrors.value) return "Cart totals updated";
  return "";
});
</script>

<template>
  <span role="status" class="sr-only">{{ message }}</span>
</template>
