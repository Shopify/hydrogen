import { useCart } from "../lib/cart";

export function CartRevalidationStatus() {
  const message = useCart((state) => {
    const pending =
      state.pending.lines.size > 0 ||
      state.pending.discountCodes.size > 0 ||
      state.revalidating === true;
    if (pending) return "Updating cart totals";
    return state.errors.network.length === 0 ? "Cart totals updated" : "";
  });

  return (
    <span role="status" class="sr-only">
      {message()}
    </span>
  );
}
