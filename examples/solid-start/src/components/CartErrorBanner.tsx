import type { CartLine } from "@shopify/hydrogen";
import { createMemo, createSignal, For, Show } from "solid-js";

import { useCart } from "../lib/cart";

export function CartErrorBanner() {
  const errors = useCart((s) => s.errors);
  const lines = useCart((s) => s.data.lines.nodes);
  const [dismissedAt, setDismissedAt] = createSignal(0);

  const visibleLineIds = createMemo(() => new Set(lines().map((line: CartLine) => line.id)));
  const orphanedLineErrors = createMemo(() =>
    [...errors().lines.entries()]
      .filter(([lineId]) => !visibleLineIds().has(lineId))
      .flatMap(([, group]) => [...group.userErrors, ...group.warnings]),
  );
  const bannerMessages = createMemo(() => [
    ...new Set([
      ...errors().network.map((error) => error.message),
      ...errors().cart.userErrors.map((error) => error.message),
      ...errors().cart.warnings.map((warning) => warning.message),
      ...errors().note.userErrors.map((error) => error.message),
      ...orphanedLineErrors().map((error) => error.message),
    ]),
  ]);
  const isVisible = createMemo(
    () => errors().lastUpdatedAt > dismissedAt() && bannerMessages().length > 0,
  );

  return (
    <Show when={isVisible()}>
      <div
        role="alert"
        class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <For each={bannerMessages()}>{(message) => <p>{message}</p>}</For>
          </div>
          <button
            type="button"
            aria-label="Dismiss cart error messages"
            class="min-h-10 shrink-0 px-2 text-xs font-semibold tracking-wide text-red-700 uppercase hover:text-red-950"
            onClick={() => setDismissedAt(Date.now())}
          >
            Dismiss
          </button>
        </div>
      </div>
    </Show>
  );
}
