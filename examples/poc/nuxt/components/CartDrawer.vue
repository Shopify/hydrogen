<script setup lang="ts">
import { useCart } from "~/storefront/cart";
import {
  CART_DRAWER_ID,
  closeCartDrawer,
  configureOpenCartAction,
  supportsDialogCommands,
} from "~/storefront/cart-drawer";

const hasItems = useCart((s) => s.data.lines.nodes.length > 0);

onMounted(() => configureOpenCartAction());
</script>

<template>
  <dialog :id="CART_DRAWER_ID" aria-labelledby="cart-drawer-title" closedby="any">
    <div class="flex h-full flex-col">
      <div class="shrink-0 border-b border-black/10">
        <div class="flex items-center justify-between px-6 py-4">
          <h2 id="cart-drawer-title" class="text-lg font-bold">Cart</h2>
          <button
            type="button"
            command="close"
            :commandfor="CART_DRAWER_ID"
            aria-label="Close cart"
            class="grid h-10 w-10 place-items-center hover:opacity-60"
            @click="!supportsDialogCommands() && closeCartDrawer()"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <CartErrorBanner />
        <CartLineItems empty-heading-level="h3" error-id-prefix="cart-drawer-line-error" />
      </div>

      <footer v-if="hasItems" class="shrink-0 space-y-3 border-t border-black/10 px-6 py-3">
        <CartDiscountCodes />
        <CartNote />
        <CartTotals />
      </footer>
    </div>
  </dialog>
</template>
