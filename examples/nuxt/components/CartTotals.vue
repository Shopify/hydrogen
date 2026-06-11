<script setup lang="ts">
import { ShopPayButton } from "@shopify/hydrogen/vue";

import { useCart } from "~/storefront/cart";
import { formatMoney } from "~/storefront/money";

const totalQuantity = useCart((s) => s.data.totalQuantity);
const checkoutUrl = useCart((s) => s.data.checkoutUrl);
const cost = useCart((s) => s.data.cost);
const isTotalsPending = useCart(
  (s) => s.pending.lines.size > 0 || s.pending.discountCodes.size > 0,
);
</script>

<template>
  <div
    class="mt-8 space-y-2 border-t border-black/10 pt-6 transition-opacity"
    :class="isTotalsPending ? 'opacity-30' : ''"
  >
    <div class="flex justify-between text-sm text-black/50">
      <span>Subtotal ({{ totalQuantity }} items)</span>
      <span>{{ formatMoney(cost.subtotalAmount) }}</span>
    </div>

    <div class="flex justify-between text-lg font-semibold">
      <span>Total</span>
      <span>{{ formatMoney(cost.totalAmount) }}</span>
    </div>

    <div v-if="checkoutUrl && totalQuantity > 0" class="mt-6 space-y-3">
      <ShopPayButton channel="headless" width="100%" height="48px" border-radius="4px" />
      <a
        :href="checkoutUrl"
        class="block rounded bg-black px-6 py-3 text-center text-sm font-medium text-white hover:bg-neutral-800"
      >
        Check out
      </a>
    </div>
    <span
      v-else
      role="link"
      aria-disabled="true"
      class="mt-6 block cursor-not-allowed rounded bg-black/40 px-6 py-3 text-center text-sm font-medium text-white"
    >
      Check out
    </span>
  </div>
</template>
