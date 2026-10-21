<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";

import { useCart } from "~/storefront/cart";

const isPending = useCart((state) => state.pending.cost === true || state.revalidating === true);
const hasNetworkErrors = useCart((state) => state.errors.network.length > 0);
const sawPending = ref(false);

watchEffect(() => {
  if (isPending.value) sawPending.value = true;
});

type CartStatusState = "idle" | "updating" | "updated" | "error";

// `updated` means the last cycle finished without a network failure. Line or
// discount user errors and warnings can still be present.
const CART_STATUS_MESSAGES: Record<CartStatusState, string> = {
  idle: "",
  updating: "Updating cart totals",
  updated: "Cart totals updated",
  error: "",
};

const state = computed<CartStatusState>(() => {
  if (isPending.value) return "updating";
  if (hasNetworkErrors.value) return "error";
  if (sawPending.value) return "updated";
  return "idle";
});
const message = computed(() => CART_STATUS_MESSAGES[state.value]);
</script>

<template>
  <span role="status" class="sr-only" :data-cart-state="state" data-testid="cart-status">{{
    message
  }}</span>
</template>
