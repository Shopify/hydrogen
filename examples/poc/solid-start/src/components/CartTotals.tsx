import { Show } from "solid-js";

import { useCart } from "../lib/cart";
import { formatMoney } from "../lib/money";
import { ShopPayButton } from "./ShopPayButton";

export function CartTotals() {
  const totalQuantity = useCart((s) => s.data.totalQuantity);
  const checkoutUrl = useCart((s) => s.data.checkoutUrl);
  const cost = useCart((s) => s.data.cost);
  const isTotalsPending = useCart((s) => s.pending.cost === true || s.revalidating === true);

  return (
    <div class="mt-8 border-t border-black/10 pt-6">
      <div class="space-y-2" aria-busy={isTotalsPending()}>
        <div
          class={`flex justify-between text-sm ${isTotalsPending() ? "text-black/60" : "text-black/70"}`}
        >
          <span>
            Subtotal ({totalQuantity()} items)
            {isTotalsPending() ? <span aria-hidden="true"> (updating)</span> : null}
          </span>
          <span>{formatMoney(cost().subtotalAmount)}</span>
        </div>

        <div
          class={`flex justify-between text-lg font-semibold ${isTotalsPending() ? "text-black/60" : ""}`}
        >
          <span>Total</span>
          <span>{formatMoney(cost().totalAmount)}</span>
        </div>
      </div>

      <Show
        when={checkoutUrl() && totalQuantity() > 0}
        fallback={
          <span
            role="link"
            aria-disabled="true"
            class="mt-6 block cursor-not-allowed rounded bg-black/40 px-6 py-3 text-center text-sm font-medium text-white"
          >
            Check out
          </span>
        }
      >
        <div class="mt-6 space-y-3">
          <ShopPayButton
            checkoutUrl={checkoutUrl() ?? undefined}
            channel="headless"
            width="100%"
            borderRadius="4px"
          />
          <a
            href={checkoutUrl() ?? undefined}
            class="block rounded bg-black px-6 py-3 text-center text-sm font-medium text-white hover:bg-neutral-800"
          >
            Check out
          </a>
        </div>
      </Show>
    </div>
  );
}
