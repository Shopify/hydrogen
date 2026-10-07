"use client";

import { useEffect, useRef, useState } from "react";

import { useCart, useCartForm, useSuspenseCart } from "@/lib/cart";
import { content } from "@/lib/content";
import { formatPrice } from "@/lib/money";

import { CartLineItem } from "./CartLineItem";

export function CartContent() {
  const lineRefs = useRef(new Map<string, HTMLLIElement>());
  const discountRemoveRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingRemovalLineId = useRef<string | null>(null);
  const pendingRemovalDiscountCode = useRef<string | null>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const emptyCartRef = useRef<HTMLDivElement>(null);
  const cart = useSuspenseCart((state) => state.data);
  const pending = useCart((state) => state.pending);
  const networkErrors = useCart((state) => state.errors.network);
  const isPending = pending.lines.size > 0 || pending.note || pending.discountCodes.size > 0;
  const lines = cart.lines.nodes;
  const totalQuantity = cart.totalQuantity;
  const subtotal = cart.cost.subtotalAmount;
  const discountCodes = cart.discountCodes;

  const { formProps, register } = useCartForm();

  useEffect(() => {
    const removedLineId = pendingRemovalLineId.current;
    if (!removedLineId || lines.some((line) => line.id === removedLineId)) return;

    pendingRemovalLineId.current = null;
    const nextLine = lineRefs.current.values().next().value;
    if (nextLine) {
      nextLine.focus();
    } else {
      emptyCartRef.current?.focus();
    }
  }, [lines]);

  useEffect(() => {
    const removedDiscountCode = pendingRemovalDiscountCode.current;
    const visibleDiscountCodes = discountCodes.map((code) => code.code).filter(Boolean);
    if (!removedDiscountCode || visibleDiscountCodes.includes(removedDiscountCode)) return;

    pendingRemovalDiscountCode.current = null;
    const nextRemoveButton = discountRemoveRefs.current.values().next().value;
    if (nextRemoveButton) {
      nextRemoveButton.focus();
    } else {
      discountInputRef.current?.focus();
    }
  }, [discountCodes]);

  const isEmpty = totalQuantity === 0 || lines.length === 0;

  return (
    <>
      <CartStatus isPending={isPending} networkErrors={networkErrors} />
      {isEmpty ? (
        <div
          ref={emptyCartRef}
          tabIndex={-1}
          className="flex flex-col items-center gap-2 py-12 text-center"
          aria-busy={isPending}
        >
          <p className="type-body-sm text-on-surface font-medium">{content.cart.empty}</p>
          <p className="text-on-surface-secondary text-sm">{content.cart.emptyDescription}</p>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul role="list" className="divide-border min-h-0 flex-1 divide-y overflow-y-auto">
            {lines.map((line) => (
              <li
                key={line.id}
                ref={(node) => {
                  if (node) lineRefs.current.set(line.id, node);
                  else lineRefs.current.delete(line.id);
                }}
                tabIndex={-1}
              >
                <CartLineItem
                  line={line}
                  onRemoveIntent={() => {
                    pendingRemovalLineId.current = line.id;
                  }}
                />
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
                  ref={discountInputRef}
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
                      ref={(node) => {
                        if (!code.code) return;
                        if (node) discountRemoveRefs.current.set(code.code, node);
                        else discountRemoveRefs.current.delete(code.code);
                      }}
                      onClick={() => {
                        pendingRemovalDiscountCode.current = code.code;
                      }}
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
              <div className="flex items-center justify-between" aria-busy={isPending}>
                <span className="text-on-surface text-sm font-medium">
                  {content.cart.totalLabel}
                  {isPending ? <span aria-hidden="true"> (updating)</span> : null}
                </span>
                <span
                  className={`text-on-surface text-base font-medium ${isPending ? "text-on-surface-secondary" : ""}`}
                >
                  {formatPrice(subtotal)}
                </span>
              </div>
              <p className="text-on-surface-secondary text-xs">
                {content.cart.taxesAndShippingAtCheckout}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CartStatus({
  isPending,
  networkErrors,
}: {
  isPending: boolean;
  networkErrors: readonly { message: string }[];
}) {
  const message = useCartStatusMessage(isPending, networkErrors.length > 0);
  return (
    <>
      <span role="status" className="sr-only">
        {message}
      </span>
      {networkErrors.length > 0 ? (
        <div role="alert" aria-atomic="true" className="mb-3 text-sm">
          {networkErrors.map((error, index) => (
            <p key={`${error.message}-${index}`}>{error.message}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}

function useCartStatusMessage(isPending: boolean, hasNetworkErrors: boolean): string {
  const [previousPending, setPreviousPending] = useState(isPending);
  const [sawPending, setSawPending] = useState(isPending);

  if (previousPending !== isPending) {
    setPreviousPending(isPending);
    if (isPending) setSawPending(true);
  }

  if (isPending) return "Updating cart totals";
  if (sawPending && !hasNetworkErrors) return "Cart totals updated";
  return "";
}
