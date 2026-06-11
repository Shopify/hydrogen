"use client";

import { ShopPayButton as HydrogenShopPayButton } from "@shopify/hydrogen/react";
import { useEffect, useMemo, useState } from "react";

import { useCart, useCartForm } from "../lib/cart";
import { formatMoney } from "../lib/money";

function AddTestItem() {
  return (
    <ul>
      <li>
        <button
          type="button"
          onClick={() => {
            window.Shopify?.actions?.updateCart(
              {
                lines: [
                  {
                    merchandiseId: "gid://shopify/ProductVariant/43695710371862",
                    quantity: 1,
                  },
                ],
              },
              {
                event: {
                  detail: {
                    products: [
                      {
                        id: "gid://shopify/ProductVariant/43695710371862",
                        title: "Small",
                        product: { title: "Slides" },
                        image: {
                          url: "https://cdn.shopify.com/s/files/1/0688/1755/1382/products/slides.jpg?v=1675447358",
                          altText: null,
                        },
                        price: { amount: "25.0", currencyCode: "CAD" },
                      },
                    ],
                  },
                },
              },
            );
          }}
          className="mt-4 rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Scenario 1
        </button>
        <button
          type="button"
          onClick={() => {
            window.Shopify?.actions?.updateCart(
              {
                lines: [
                  {
                    merchandiseId: "gid://shopify/ProductVariant/43695710371862",
                    quantity: 4,
                  },
                  {
                    merchandiseId: "gid://shopify/ProductVariant/43696926949398",
                    quantity: 1,
                  },
                  {
                    merchandiseId: "gid://shopify/ProductVariant/43696932126742",
                    quantity: 2,
                  },
                ],
              },
              {
                event: {
                  detail: {
                    products: [
                      {
                        id: "gid://shopify/ProductVariant/43695710371862",
                        title: "Small",
                        product: { title: "Slides" },
                        image: {
                          url: "https://cdn.shopify.com/s/files/1/0688/1755/1382/products/slides.jpg?v=1675447358",
                          altText: null,
                        },
                        price: { amount: "25.0", currencyCode: "CAD" },
                      },
                      {
                        id: "gid://shopify/ProductVariant/43696926949398",
                        title: "Small / Green",
                        product: { title: "Sweatpants" },
                        image: {
                          url: "https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenSweatpants01.jpg?v=1675455387",
                          altText: null,
                        },
                        price: { amount: "35.0", currencyCode: "CAD" },
                      },
                      {
                        id: "gid://shopify/ProductVariant/43696932126742",
                        title: "Small / Green",
                        product: { title: "Men's T-shirt" },
                        image: {
                          url: "https://cdn.shopify.com/s/files/1/0688/1755/1382/products/GreenTshirt01.jpg?v=1675455410",
                          altText: null,
                        },
                        price: { amount: "40.0", currencyCode: "CAD" },
                      },
                    ],
                  },
                },
              },
            );
          }}
          className="mt-4 rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Scenario 2
        </button>
      </li>
    </ul>
  );
}

export function CartContent() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight">Cart</h1>

      <AddTestItem />
      <CartErrorBanner />
      <LineItems />
      <CartFooter />
    </main>
  );
}

function CartErrorBanner() {
  const errors = useCart((s) => s.errors);
  const lines = useCart((s) => s.data.lines.nodes);
  const [dismissedAt, setDismissedAt] = useState(0);
  const visibleLineIds = useMemo(() => new Set(lines.map((line) => line.id)), [lines]);

  if (errors.lastUpdatedAt <= dismissedAt) return null;

  const orphanedLineErrors = [...errors.lines.entries()]
    .filter(([lineId]) => !visibleLineIds.has(lineId))
    .flatMap(([, group]) => [...group.userErrors, ...group.warnings]);

  const bannerMessages = [
    ...new Set([
      ...errors.network.map((error) => error.message),
      ...errors.cart.userErrors.map((error) => error.message),
      ...errors.cart.warnings.map((warning) => warning.message),
      ...errors.note.userErrors.map((error) => error.message),
      ...orphanedLineErrors.map((error) => error.message),
    ]),
  ];

  if (bannerMessages.length === 0) return null;

  return (
    <div
      role="alert"
      className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {bannerMessages.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDismissedAt(Date.now())}
          className="shrink-0 text-xs font-semibold tracking-wide text-red-700 uppercase hover:text-red-950"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function CartFooter() {
  return (
    <div className="mt-8 space-y-6">
      <DiscountCodes />
      <CartNote />
      <CartTotals />
      <CheckoutButton />
    </div>
  );
}

export function CartTotals() {
  const totalQuantity = useCart((s) => s.data.totalQuantity);
  const cost = useCart((s) => s.data.cost);
  const isTotalsPending = useCart(
    (s) => s.pending.lines.size > 0 || s.pending.discountCodes.size > 0,
  );

  return (
    <div className={`space-y-2 transition-opacity ${isTotalsPending ? "opacity-30" : ""}`}>
      <div className="flex justify-between text-sm text-neutral-500">
        <span>Subtotal ({totalQuantity} items)</span>
        <span>{formatMoney(cost.subtotalAmount)}</span>
      </div>

      <div className="flex justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{formatMoney(cost.totalAmount)}</span>
      </div>
    </div>
  );
}

export function CheckoutButton() {
  const lines = useCart((s) => s.data.lines.nodes);
  const checkoutUrl = useCart((s) => s.data.checkoutUrl);

  return checkoutUrl && lines.length > 0 ? (
    <div className="space-y-3">
      <HydrogenShopPayButton channel="headless" width="100%" height="48px" borderRadius="4px" />
      <a
        href={checkoutUrl}
        className="block rounded bg-black py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800"
      >
        Check out
      </a>
    </div>
  ) : (
    <span
      role="link"
      aria-disabled="true"
      className="block cursor-not-allowed rounded bg-black/40 py-3 text-center text-sm font-semibold text-white"
    >
      Check out
    </span>
  );
}

export function LineItems() {
  const lines = useCart((s) => s.data.lines.nodes);
  const loading = useCart((s) => s.loading);
  const pendingLines = useCart((s) => s.pending.lines);
  const lineErrors = useCart((s) => s.errors.lines);
  const { formProps, register } = useCartForm();

  if (loading) {
    return (
      <div className="mt-8 animate-pulse space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-lg bg-neutral-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-neutral-200" />
              <div className="h-3 w-20 rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return <p className="mt-8 text-neutral-500">Your cart is empty.</p>;
  }

  return (
    <ul className="mt-8 divide-y divide-neutral-200">
      {lines.map((line) => {
        const errorsForLine = lineErrors.get(line.id);
        const firstLineError = errorsForLine?.userErrors[0] ?? errorsForLine?.warnings[0];
        const errorId = `cart-line-error-${line.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

        return (
          <li key={line.id} className="py-6">
            <form
              {...formProps()}
              aria-describedby={firstLineError ? errorId : undefined}
              className="space-y-3"
            >
              <button {...register("set")} />
              <div className="flex items-center gap-6">
                <input type="hidden" {...register("lineId", { value: line.id })} />

                {line.merchandise?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={line.merchandise.image.url}
                    alt={line.merchandise.image.altText ?? line.merchandise.product.title}
                    className="h-24 w-24 rounded-lg bg-neutral-100 object-cover"
                  />
                )}

                <div className="flex-1">
                  <p className="font-semibold">
                    {line.merchandise?.product.title ?? "Unknown product"}
                  </p>
                  {line.merchandise?.title && (
                    <p className="text-xs text-neutral-400">{line.merchandise.title}</p>
                  )}
                  <p className="text-sm text-neutral-500">
                    {formatMoney(line.cost.amountPerQuantity)} each
                    {line.cost.compareAtAmountPerQuantity &&
                      Number(line.cost.compareAtAmountPerQuantity.amount) >
                        Number(line.cost.amountPerQuantity.amount) && (
                        <span className="ml-2 text-neutral-300 line-through">
                          {formatMoney(line.cost.compareAtAmountPerQuantity)}
                        </span>
                      )}
                  </p>
                  <p className="text-sm font-medium">{formatMoney(line.cost.totalAmount)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    {...register("decrease")}
                    disabled={line.quantity <= 1}
                    className="h-8 w-8 rounded border border-neutral-300 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    -
                  </button>

                  <input
                    {...register("quantity", { value: line.quantity, interactive: true })}
                    aria-invalid={Boolean(firstLineError)}
                    className={`w-8 text-center tabular-nums transition-opacity ${pendingLines.has(line.id) ? "opacity-30" : ""}`}
                  />

                  <button
                    type="submit"
                    {...register("increase")}
                    disabled={
                      line.merchandise?.quantityAvailable != null &&
                      line.quantity >= line.merchandise.quantityAvailable
                    }
                    className="h-8 w-8 rounded border border-neutral-300 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <button
                  type="submit"
                  {...register("remove")}
                  className="text-sm text-red-600 underline hover:text-red-800"
                >
                  Remove
                </button>
              </div>

              {firstLineError && (
                <p id={errorId} role="alert" className="text-sm text-red-600">
                  {firstLineError.message}
                </p>
              )}
            </form>
          </li>
        );
      })}
    </ul>
  );
}

export function DiscountCodes() {
  const lines = useCart((s) => s.data.lines.nodes);
  const discountCodes = useCart((s) => s.data.discountCodes);
  const pendingDiscountCodes = useCart((s) => s.pending.discountCodes);
  const discountCodeErrors = useCart((s) => s.errors.discountCodes);
  const { formProps, register } = useCartForm();

  if (lines.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        Discount Codes
      </h2>

      {discountCodes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {discountCodes.map((dc) => {
            const isPending = pendingDiscountCodes.has(dc.code);
            const errorsForDiscountCode = discountCodeErrors.get(dc.code);
            const firstDiscountCodeError =
              errorsForDiscountCode?.userErrors[0] ?? errorsForDiscountCode?.warnings[0];
            return (
              <li key={dc.code} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <code
                    className={`rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs transition-opacity ${isPending ? "opacity-30" : ""}`}
                  >
                    {dc.code}
                  </code>
                  <span
                    className={`transition-opacity ${isPending ? "opacity-30" : ""} ${dc.applicable ? "text-green-600" : "text-amber-600"}`}
                  >
                    {dc.applicable ? "Applied" : "Not applicable"}
                  </span>
                  {firstDiscountCodeError && (
                    <p role="alert" className="text-xs text-red-600">
                      {firstDiscountCodeError.message}
                    </p>
                  )}
                </span>
                <form {...formProps()}>
                  <input type="hidden" {...register("discountCode", { value: dc.code })} />
                  <button
                    type="submit"
                    {...register("discount-remove")}
                    className="text-xs text-red-600 underline hover:text-red-800"
                  >
                    Remove
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <form
        {...formProps({
          beforeSubmit: (e) => {
            const code = new FormData(e.currentTarget).get("discountCode") as string;
            if (!code?.trim()) {
              e.preventDefault();
              return;
            }
            const isDuplicate = discountCodes.some(
              (dc) => dc.code.toLowerCase() === code.toLowerCase(),
            );
            if (isDuplicate) {
              e.preventDefault();
              return;
            }
          },
          afterSubmit: (e) => e.currentTarget.reset(),
        })}
        className="mt-3 flex gap-2"
      >
        <input
          type="text"
          {...register("discountCode", { defaultValue: "" })}
          placeholder="Enter discount code"
          className="flex-1 rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none"
        />
        <button
          type="submit"
          {...register("discount-apply")}
          className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Apply
        </button>
      </form>
    </div>
  );
}

export function CartNote() {
  const lines = useCart((s) => s.data.lines.nodes);
  const note = useCart((s) => s.data.note ?? "");
  const pending = useCart((s) => s.pending.note);
  const { formProps, register } = useCartForm();
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    if (!pending) setDraft(note);
  }, [note, pending]);

  if (lines.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
          Order Note
        </h2>
        {pending && <span className="text-xs text-neutral-400">Saving...</span>}
      </div>
      <form {...formProps()} className="mt-3 space-y-2">
        <input type="hidden" {...register("note", { value: draft })} />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note to your order..."
          rows={2}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
        <button
          type="submit"
          {...register("note-update")}
          disabled={draft === note}
          className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          Save note
        </button>
      </form>
    </div>
  );
}
