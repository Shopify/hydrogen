import { Show } from "solid-js";

import { useCart } from "../lib/cart";
import { CartDiscountCodes } from "./CartDiscountCodes";
import { CartErrorBanner } from "./CartErrorBanner";
import { CartLineItems } from "./CartLineItems";
import { CartNote } from "./CartNote";
import { CartTotals } from "./CartTotals";

export function Cart() {
  const loading = useCart((s) => s.loading);
  const lines = useCart((s) => s.data.lines.nodes);

  return (
    <div>
      <CartErrorBanner />
      <CartLineItems />

      <Show when={!loading() && lines().length > 0}>
        <CartTotals />
        <CartDiscountCodes />
        <CartNote />
      </Show>
    </div>
  );
}
