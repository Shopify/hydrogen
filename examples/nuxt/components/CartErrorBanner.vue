<script setup lang="ts">
import type { CartLine } from "@shopify/hydrogen";

import { ref, computed } from "#imports";
import { useCart } from "~/storefront/cart";

const errors = useCart((s) => s.errors);
const lines = useCart((s) => s.data.lines.nodes);
const dismissedAt = ref(0);

const visibleLineIds = computed(() => new Set(lines.value.map((l: CartLine) => l.id)));

const orphanedLineErrors = computed(() =>
  [...errors.value.lines.entries()]
    .filter(([lineId]) => !visibleLineIds.value.has(lineId))
    .flatMap(([, group]) => [...group.userErrors, ...group.warnings]),
);

const bannerMessages = computed(() => [
  ...new Set([
    ...errors.value.network.map((e) => e.message),
    ...errors.value.cart.userErrors.map((e) => e.message),
    ...errors.value.cart.warnings.map((w) => w.message),
    ...errors.value.note.userErrors.map((e) => e.message),
    ...orphanedLineErrors.value.map((e) => e.message),
  ]),
]);

const isVisible = computed(
  () => errors.value.lastUpdatedAt > dismissedAt.value && bannerMessages.value.length > 0,
);

function dismiss() {
  dismissedAt.value = Date.now();
}
</script>

<template>
  <div
    v-if="isVisible"
    role="alert"
    class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <p v-for="(message, index) in bannerMessages" :key="index">
          {{ message }}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss cart error messages"
        class="min-h-10 shrink-0 px-2 text-xs font-semibold tracking-wide text-red-700 uppercase hover:text-red-950"
        @click="dismiss"
      >
        Dismiss
      </button>
    </div>
  </div>
</template>
