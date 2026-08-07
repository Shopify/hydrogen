<script setup lang="ts">
import type { DiscountCode } from "@shopify/hydrogen";

import { useCart, useCartForm } from "~/storefront/cart";

const discountCodes = useCart((s) => s.data.discountCodes);
const pendingDiscountCodes = useCart((s) => s.pending.discountCodes);
const discountCodeErrors = useCart((s) => s.errors.discountCodes);
const { formProps, register } = useCartForm();

function validateDiscountApply(e: Event) {
  const form = e.target as HTMLFormElement;
  const code = new FormData(form).get("discountCode") as string;
  if (!code?.trim()) {
    e.preventDefault();
    return;
  }
  const isDuplicate = discountCodes.value.some(
    (dc: DiscountCode) => dc.code.toLowerCase() === code.toLowerCase(),
  );
  if (isDuplicate) {
    e.preventDefault();
  }
}

function resetForm(e: Event) {
  (e.target as HTMLFormElement).reset();
}
</script>

<template>
  <div class="mt-8 border-t border-black/10 pt-6">
    <h2 class="text-sm font-semibold tracking-wide text-black/50 uppercase">Discount Codes</h2>

    <ul v-if="discountCodes.length > 0" class="mt-3 space-y-2">
      <li v-for="dc in discountCodes" :key="dc.code" class="flex items-center justify-between">
        <span class="flex items-center gap-2 text-sm">
          <code
            class="rounded bg-black/5 px-2 py-0.5 font-mono text-xs transition-opacity"
            :class="pendingDiscountCodes.has(dc.code) ? 'opacity-30' : ''"
          >
            {{ dc.code }}
          </code>
          <span
            class="transition-opacity"
            :class="[
              pendingDiscountCodes.has(dc.code) ? 'opacity-30' : '',
              dc.applicable ? 'text-green-600' : 'text-amber-600',
            ]"
          >
            {{ dc.applicable ? "Applied" : "Not applicable" }}
          </span>
          <p
            v-if="
              discountCodeErrors.get(dc.code)?.userErrors[0] ??
              discountCodeErrors.get(dc.code)?.warnings[0]
            "
            role="alert"
            class="text-xs text-red-600"
          >
            {{
              (
                discountCodeErrors.get(dc.code)?.userErrors[0] ??
                discountCodeErrors.get(dc.code)?.warnings[0]
              )?.message
            }}
          </p>
        </span>
        <form v-bind="formProps()">
          <input type="hidden" v-bind="register('discountCode', { value: dc.code })" />
          <button
            type="submit"
            v-bind="register('discount-remove')"
            class="text-xs text-red-600 underline hover:text-red-800"
          >
            Remove
          </button>
        </form>
      </li>
    </ul>

    <form
      v-bind="
        formProps({
          beforeSubmit: validateDiscountApply,
          afterSubmit: resetForm,
        })
      "
      class="mt-3 flex gap-2"
    >
      <input
        type="text"
        v-bind="register('discountCode', { defaultValue: '' })"
        placeholder="Enter discount code"
        class="flex-1 rounded border border-black/15 px-3 py-1.5 text-sm focus:border-black focus:outline-none"
      />
      <button
        type="submit"
        v-bind="register('discount-apply')"
        class="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-black/80"
      >
        Apply
      </button>
    </form>
  </div>
</template>
