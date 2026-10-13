import { createEffect, createSignal } from "solid-js";

import { useCart } from "../lib/cart";

export function CartRevalidationStatus() {
  const isPending = useCart((state) => state.pending.cost === true || state.revalidating === true);
  const hasNetworkErrors = useCart((state) => state.errors.network.length > 0);
  const [sawPending, setSawPending] = createSignal(false);

  createEffect(() => {
    if (isPending()) setSawPending(true);
  });

  const message = () => {
    if (isPending()) return "Updating cart totals";
    if (sawPending() && !hasNetworkErrors()) return "Cart totals updated";
    return "";
  };

  return (
    <span role="status" class="sr-only">
      {message()}
    </span>
  );
}
