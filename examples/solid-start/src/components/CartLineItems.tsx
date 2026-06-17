import { A } from "@solidjs/router";
import { createEffect, createSignal, For, Show } from "solid-js";

import { useCart, useCartForm } from "../lib/cart";
import { closeCartDrawer } from "../lib/cart-drawer";
import { formatMoney } from "../lib/money";

export function CartLineItems(props: { emptyHeadingLevel?: "h2" | "h3"; errorIdPrefix?: string }) {
  const lines = useCart((s) => s.data.lines.nodes);
  const loading = useCart((s) => s.loading);
  const pendingLines = useCart((s) => s.pending.lines);
  const lineErrors = useCart((s) => s.errors.lines);
  const { formProps, register } = useCartForm();
  const [cartLinesRegion, setCartLinesRegion] = createSignal<HTMLElement | null>(null);
  let previousLineCount = 0;

  createEffect(() => {
    const nextLineCount = lines().length;
    if (previousLineCount === 0) {
      previousLineCount = nextLineCount;
      return;
    }
    if (nextLineCount >= previousLineCount || typeof document === "undefined") {
      previousLineCount = nextLineCount;
      return;
    }
    previousLineCount = nextLineCount;
    queueMicrotask(() => {
      const region = cartLinesRegion();
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
    });
  });

  function errorIdForLine(lineId: string) {
    return `${props.errorIdPrefix ?? "cart-line-error"}-${lineId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  const Heading = props.emptyHeadingLevel ?? "h2";

  return (
    <Show
      when={!loading()}
      fallback={
        <div
          ref={setCartLinesRegion}
          role="status"
          aria-live="polite"
          class="mt-8 animate-pulse space-y-6"
        >
          <span class="sr-only">Loading cart items</span>
          <For each={[1, 2]}>
            {() => (
              <div class="flex items-center gap-6">
                <div class="h-24 w-24 rounded-lg bg-black/5" />
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-32 rounded bg-black/5" />
                  <div class="h-3 w-20 rounded bg-black/5" />
                </div>
              </div>
            )}
          </For>
        </div>
      }
    >
      <Show
        when={lines().length > 0}
        fallback={
          <div ref={setCartLinesRegion} class="py-20 text-center">
            <Heading class="text-2xl font-bold">Your cart is empty</Heading>
            <p class="mt-2 text-black/60">Add some items to get started.</p>
            <A
              href="/collections"
              class="mt-6 inline-block rounded-full bg-black px-8 py-3 text-sm font-semibold text-white hover:opacity-90"
              onClick={closeCartDrawer}
            >
              Continue shopping
            </A>
          </div>
        }
      >
        <ul ref={setCartLinesRegion} class="mt-8 divide-y divide-black/10">
          <For each={lines()}>
            {(line) => {
              const lineError = () =>
                lineErrors().get(line.id)?.userErrors[0] ?? lineErrors().get(line.id)?.warnings[0];
              return (
                <li class="py-6">
                  <form
                    {...formProps()}
                    aria-describedby={lineError() ? errorIdForLine(line.id) : undefined}
                    class="space-y-3"
                  >
                    <div class="flex items-center gap-6">
                      <input type="hidden" {...register("lineId", { value: line.id })} />
                      <button {...register("set")} aria-hidden="true" />

                      <Show when={line.merchandise?.image}>
                        {(image) => (
                          <img
                            src={image().url}
                            alt={image().altText ?? line.merchandise?.product.title}
                            class="h-24 w-24 rounded-lg bg-black/5 object-cover"
                          />
                        )}
                      </Show>

                      <div class="flex-1">
                        <p class="font-semibold">
                          {line.merchandise?.product.title ?? "Unknown product"}
                        </p>
                        <Show when={line.merchandise?.title}>
                          <p class="text-xs text-black/40">{line.merchandise?.title}</p>
                        </Show>
                        <p class="text-sm text-black/50">
                          {formatMoney(line.cost.amountPerQuantity)} each
                          <Show when={line.cost.compareAtAmountPerQuantity}>
                            {(compareAtAmount) => (
                              <Show
                                when={
                                  Number(compareAtAmount().amount) >
                                  Number(line.cost.amountPerQuantity.amount)
                                }
                              >
                                <span class="ml-2 text-black/30 line-through">
                                  {formatMoney(compareAtAmount())}
                                </span>
                              </Show>
                            )}
                          </Show>
                        </p>
                        <p
                          class={
                            pendingLines().has(line.id)
                              ? "text-sm font-medium opacity-30 transition-opacity"
                              : "text-sm font-medium transition-opacity"
                          }
                        >
                          {formatMoney(line.cost.totalAmount)}
                        </p>
                      </div>

                      <div class="flex items-center gap-2">
                        <button
                          type="submit"
                          aria-label={`Decrease quantity for ${
                            line.merchandise?.product.title ?? "cart item"
                          }`}
                          {...register("decrease")}
                          class="grid h-8 w-8 place-items-center rounded-full border border-black/15 text-sm hover:border-black"
                        >
                          -
                        </button>

                        <input
                          {...register("quantity", { value: line.quantity, interactive: true })}
                          aria-label={`Quantity for ${line.merchandise?.product.title ?? "cart item"}`}
                          aria-invalid={Boolean(lineError())}
                          class={
                            pendingLines().has(line.id)
                              ? "w-8 text-center tabular-nums opacity-30 transition-opacity"
                              : "w-8 text-center tabular-nums transition-opacity"
                          }
                        />

                        <button
                          type="submit"
                          aria-label={`Increase quantity for ${
                            line.merchandise?.product.title ?? "cart item"
                          }`}
                          {...register("increase")}
                          class="grid h-8 w-8 place-items-center rounded-full border border-black/15 text-sm hover:border-black"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="submit"
                        aria-label={`Remove ${
                          line.merchandise?.product.title ?? "cart item"
                        } from cart`}
                        {...register("remove")}
                        class="min-h-6 py-1 text-sm text-red-600 underline hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>

                    <Show when={lineError()}>
                      {(error) => (
                        <p id={errorIdForLine(line.id)} role="alert" class="text-sm text-red-600">
                          {error().message}
                        </p>
                      )}
                    </Show>
                  </form>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </Show>
  );
}
