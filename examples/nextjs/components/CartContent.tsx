"use client";
import { useSuspenseCart, useCartForm } from "@/lib/cart";
import { content } from "@/lib/content";
import { formatPrice } from "@/lib/money";

import { CartLineItem } from "./CartLineItem";

export function CartContent() {
  const cart = useSuspenseCart((state) => state.data);
  const lines = cart.lines.nodes;
  const totalQuantity = cart.totalQuantity;
  const subtotal = cart.cost.subtotalAmount;
  const discountCodes = cart.discountCodes;

  const { formProps, register } = useCartForm();

  if (totalQuantity === 0 || lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="type-body-sm text-on-surface font-medium">{content.cart.empty}</p>
        <p className="text-on-surface-secondary text-sm">{content.cart.emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ul role="list" className="divide-border min-h-0 flex-1 divide-y overflow-y-auto">
        {lines.map((line) => (
          <li key={line.id}>
            <CartLineItem line={line} />
          </li>
        ))}
      </ul>

      <div className="border-border mt-3 shrink-0 border-t pt-3">
        <div className="flex flex-col gap-3">
          {/* Discount apply form */}
          <form {...formProps()} className="flex gap-2">
            <input
              type="text"
              {...register("discountCode", { defaultValue: "" })}
              placeholder="Discount code"
              aria-label="Discount code"
              className="number-reset rounded-button border-border h-11 flex-1 border px-3 text-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              required
            />
            <button
              type="submit"
              {...register("discount-apply")}
              className="rounded-button button-secondary inline-flex h-11 items-center justify-center px-4 text-sm font-medium"
            >
              Apply
            </button>
          </form>

          {/* Applied discount codes — each removal is its own form. Empty/
              falsy codes are filtered out so an empty apply never renders a
              blank pill or collides on a `""` React key. */}
          {discountCodes
            .filter((code) => code.code)
            .map((code, index) => (
              <form
                {...formProps()}
                key={`${code.code}-${index}`}
                className="flex items-center gap-2"
              >
                <input type="hidden" {...register("discountCode", { value: code.code })} />
                <span className="chip-filled rounded-full px-3 py-1 text-sm">{code.code}</span>
                <button
                  type="submit"
                  {...register("discount-remove")}
                  className="button-icon rounded text-sm"
                  aria-label={`Remove discount ${code.code}`}
                >
                  <img
                    src="/icons/icon-x.svg"
                    width="16"
                    height="16"
                    alt=""
                    className="size-4"
                    aria-hidden="true"
                  />
                </button>
              </form>
            ))}

          {/* Estimated total */}
          <div className="flex items-center justify-between">
            <span className="text-on-surface text-sm font-medium">{content.cart.totalLabel}</span>
            <span className="text-on-surface text-base font-medium">{formatPrice(subtotal)}</span>
          </div>
          <p className="text-on-surface-secondary text-xs">
            {content.cart.taxesAndShippingAtCheckout}
          </p>
        </div>
      </div>
    </div>
  );
}
