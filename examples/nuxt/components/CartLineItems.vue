<script setup lang="ts">
import { useCart, useCartForm } from "~/storefront/cart";
import { closeCartDrawer } from "~/storefront/cart-drawer";
import { formatMoney } from "~/storefront/money";

const props = withDefaults(
  defineProps<{
    emptyHeadingLevel?: "h2" | "h3";
    errorIdPrefix?: string;
  }>(),
  { errorIdPrefix: "cart-line-error" },
);

const lines = useCart((s) => s.data.lines.nodes);
const loading = useCart((s) => s.loading);
const pendingLines = useCart((s) => s.pending.lines);
const lineErrors = useCart((s) => s.errors.lines);
const { formProps, register } = useCartForm();
const cartLinesRegion = ref<HTMLElement | null>(null);

watch(
  lines,
  async (nextLines, previousLines) => {
    if (nextLines.length >= previousLines.length || typeof document === "undefined") return;

    await nextTick();

    const region = cartLinesRegion.value;
    const ownerDialog = region?.closest("dialog");
    if (!region || (ownerDialog instanceof HTMLDialogElement && !ownerDialog.open)) return;

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      activeElement !== document.body &&
      document.body.contains(activeElement)
    ) {
      return;
    }

    region
      .querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      )
      ?.focus();
  },
  { flush: "post" },
);

function errorIdForLine(lineId: string) {
  return `${props.errorIdPrefix}-${lineId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
</script>

<template>
  <div
    ref="cartLinesRegion"
    v-if="loading"
    role="status"
    aria-live="polite"
    class="mt-8 animate-pulse space-y-6"
  >
    <span class="sr-only">Loading cart items</span>
    <div v-for="i in 2" :key="i" class="flex items-center gap-6">
      <div class="h-24 w-24 rounded-lg bg-black/5" />
      <div class="flex-1 space-y-2">
        <div class="h-4 w-32 rounded bg-black/5" />
        <div class="h-3 w-20 rounded bg-black/5" />
      </div>
    </div>
  </div>

  <div v-else-if="lines.length === 0" ref="cartLinesRegion" class="py-20 text-center">
    <component :is="emptyHeadingLevel ?? 'h2'" class="text-2xl font-bold">
      Your cart is empty
    </component>
    <p class="mt-2 text-black/60">Add some items to get started.</p>
    <NuxtLink
      to="/collections"
      class="mt-6 inline-block rounded-full bg-black px-8 py-3 text-sm font-semibold text-white hover:opacity-90"
      @click="closeCartDrawer"
    >
      Continue shopping
    </NuxtLink>
  </div>

  <ul v-else ref="cartLinesRegion" class="mt-8 divide-y divide-black/10">
    <li v-for="line in lines" :key="line.id" class="py-6">
      <form
        v-bind="formProps()"
        :aria-describedby="
          lineErrors.get(line.id)?.userErrors[0] || lineErrors.get(line.id)?.warnings[0]
            ? errorIdForLine(line.id)
            : undefined
        "
        class="space-y-3"
      >
        <div class="flex items-center gap-6">
          <input type="hidden" v-bind="register('lineId', { value: line.id })" />

          <img
            v-if="line.merchandise?.image"
            :src="line.merchandise.image.url"
            :alt="line.merchandise.image.altText ?? line.merchandise.product.title"
            class="h-24 w-24 rounded-lg bg-black/5 object-cover"
          />

          <div class="flex-1">
            <p class="font-semibold">
              {{ line.merchandise?.product.title ?? "Unknown product" }}
            </p>
            <p v-if="line.merchandise?.title" class="text-xs text-black/40">
              {{ line.merchandise.title }}
            </p>
            <p class="text-sm text-black/50">
              {{ formatMoney(line.cost.amountPerQuantity) }} each
              <span
                v-if="
                  line.cost.compareAtAmountPerQuantity &&
                  Number(line.cost.compareAtAmountPerQuantity.amount) >
                    Number(line.cost.amountPerQuantity.amount)
                "
                class="ml-2 text-black/30 line-through"
              >
                {{ formatMoney(line.cost.compareAtAmountPerQuantity) }}
              </span>
            </p>
            <p
              class="text-sm font-medium transition-opacity"
              :class="pendingLines.has(line.id) ? 'opacity-30' : ''"
            >
              {{ formatMoney(line.cost.totalAmount) }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="submit"
              :aria-label="`Decrease quantity for ${line.merchandise?.product.title ?? 'cart item'}`"
              v-bind="register('decrease')"
              class="grid h-8 w-8 place-items-center rounded-full border border-black/15 text-sm hover:border-black"
            >
              -
            </button>

            <input
              type="text"
              inputmode="numeric"
              v-bind="register('quantity', { value: line.quantity })"
              :aria-label="`Quantity for ${line.merchandise?.product.title ?? 'cart item'}`"
              :aria-invalid="
                Boolean(
                  lineErrors.get(line.id)?.userErrors[0] || lineErrors.get(line.id)?.warnings[0],
                )
              "
              class="w-8 text-center tabular-nums transition-opacity"
              :class="pendingLines.has(line.id) ? 'opacity-30' : ''"
            />

            <button
              type="submit"
              :aria-label="`Increase quantity for ${line.merchandise?.product.title ?? 'cart item'}`"
              v-bind="register('increase')"
              class="grid h-8 w-8 place-items-center rounded-full border border-black/15 text-sm hover:border-black"
            >
              +
            </button>
          </div>

          <button
            type="submit"
            :aria-label="`Remove ${line.merchandise?.product.title ?? 'cart item'} from cart`"
            v-bind="register('remove')"
            class="min-h-6 py-1 text-sm text-red-600 underline hover:text-red-800"
          >
            Remove
          </button>
        </div>

        <p
          v-if="lineErrors.get(line.id)?.userErrors[0] || lineErrors.get(line.id)?.warnings[0]"
          :id="errorIdForLine(line.id)"
          role="alert"
          class="text-sm text-red-600"
        >
          {{
            (lineErrors.get(line.id)?.userErrors[0] ?? lineErrors.get(line.id)?.warnings[0])
              ?.message
          }}
        </p>
      </form>
    </li>
  </ul>
</template>
