<script setup lang="ts">
import { ShopPayButton } from "@shopify/hydrogen/vue";

import { useCart } from "~/storefront/cart";
import { formatMoney } from "~/storefront/money";

const totalQuantity = useCart((s) => s.data.totalQuantity);
const checkoutUrl = useCart((s) => s.data.checkoutUrl);
const cost = useCart((s) => s.data.cost);
const isTotalsPending = useCart((s) => s.pending.cost === true || s.revalidating === true);
</script>

<template>
  <div class="mt-8 border-t border-black/10 pt-6">
    <div class="space-y-2" :aria-busy="isTotalsPending">
      <div
        class="flex justify-between text-sm"
        :class="isTotalsPending ? 'text-black/60' : 'text-black/70'"
      >
        <span>
          Subtotal ({{ totalQuantity }} items)
          <span v-if="isTotalsPending" aria-hidden="true"> (updating)</span>
        </span>
        <span>{{ formatMoney(cost.subtotalAmount) }}</span>
      </div>

      <div
        class="flex justify-between text-lg font-semibold"
        :class="isTotalsPending ? 'text-black/60' : ''"
      >
        <span>Total</span>
        <span>{{ formatMoney(cost.totalAmount) }}</span>
      </div>
    </div>

    <div v-if="checkoutUrl && totalQuantity > 0" class="mt-6 space-y-3">
      <ShopPayButton width="100%" border-radius="4px" />
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
