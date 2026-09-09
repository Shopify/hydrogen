import type { DiscountCode } from "@shopify/hydrogen";
import { For, Show } from "solid-js";

import { useCart, useCartForm } from "../lib/cart";

function resetForm(event: SubmitEvent) {
  (event.target as HTMLFormElement).reset();
}

export function CartDiscountCodes() {
  const discountCodes = useCart((s) => s.data.discountCodes);
  const pendingDiscountCodes = useCart((s) => s.pending.discountCodes);
  const discountCodeErrors = useCart((s) => s.errors.discountCodes);
  const { formProps, register } = useCartForm();

  function validateDiscountApply(event: SubmitEvent) {
    const form = event.target as HTMLFormElement;
    const code = new FormData(form).get("discountCode") as string;
    if (!code?.trim()) {
      event.preventDefault();
      return;
    }
    const isDuplicate = discountCodes().some(
      (discountCode: DiscountCode) => discountCode.code.toLowerCase() === code.toLowerCase(),
    );
    if (isDuplicate) event.preventDefault();
  }

  return (
    <div class="mt-8 border-t border-black/10 pt-6">
      <h2 class="text-sm font-semibold tracking-wide text-black/50 uppercase">Discount Codes</h2>

      <Show when={discountCodes().length > 0}>
        <ul class="mt-3 space-y-2">
          <For each={discountCodes()}>
            {(discountCode) => {
              const discountError = () =>
                discountCodeErrors().get(discountCode.code)?.userErrors[0] ??
                discountCodeErrors().get(discountCode.code)?.warnings[0];
              return (
                <li class="flex items-center justify-between">
                  <span class="flex items-center gap-2 text-sm">
                    <code
                      class={
                        pendingDiscountCodes().has(discountCode.code)
                          ? "rounded bg-black/5 px-2 py-0.5 font-mono text-xs opacity-30 transition-opacity"
                          : "rounded bg-black/5 px-2 py-0.5 font-mono text-xs transition-opacity"
                      }
                    >
                      {discountCode.code}
                    </code>
                    <span
                      class={[
                        "transition-opacity",
                        pendingDiscountCodes().has(discountCode.code) ? "opacity-30" : "",
                        discountCode.applicable ? "text-green-600" : "text-amber-600",
                      ].join(" ")}
                    >
                      {discountCode.applicable ? "Applied" : "Not applicable"}
                    </span>
                    <Show when={discountError()}>
                      {(error) => (
                        <p role="alert" class="text-xs text-red-600">
                          {error().message}
                        </p>
                      )}
                    </Show>
                  </span>
                  <form {...formProps()}>
                    <input
                      type="hidden"
                      {...register("discountCode", { value: discountCode.code })}
                    />
                    <button
                      type="submit"
                      {...register("discount-remove")}
                      class="text-xs text-red-600 underline hover:text-red-800"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>

      <form
        {...formProps({ beforeSubmit: validateDiscountApply, afterSubmit: resetForm })}
        class="mt-3 flex gap-2"
      >
        <input
          type="text"
          {...register("discountCode", { defaultValue: "" })}
          placeholder="Enter discount code"
          class="flex-1 rounded border border-black/15 px-3 py-1.5 text-sm focus:border-black focus:outline-none"
        />
        <button
          type="submit"
          {...register("discount-apply")}
          class="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-black/80"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
