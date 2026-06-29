"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useCart, useCartForm } from "../lib/cart";
import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { formatPrice } from "../lib/money";
import { publishCartViewed } from "./AnalyticsTrackers";

type CartLineView = {
  id: string;
  quantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  merchandise?: {
    title?: string | null;
    selectedOptions?: Array<{ name: string; value: string }> | null;
    image?: { url: string; altText?: string | null } | null;
    product?: { title?: string | null; handle?: string | null } | null;
  } | null;
};

function CartLineItem({ line }: { line: CartLineView }) {
  const { formProps, register } = useCartForm();
  const pendingLines = useCart((state) => state.pending.lines);
  const pending = pendingLines.has(line.id);
  const merchandise = line.merchandise;
  const product = merchandise?.product;
  const title = product?.title ?? merchandise?.title ?? "Product";
  const options = merchandise?.selectedOptions ?? [];

  return (
    <li data-testid="cart-line" className="flex gap-3 py-4">
      <div className="bg-surface-secondary size-20 shrink-0 overflow-hidden">
        {merchandise?.image ? (
          <img
            src={shopifyImageUrl(merchandise.image.url, {
              width: 160,
              height: 160,
              crop: "center",
            })}
            srcSet={srcSetFor(merchandise.image.url, {
              width: 160,
              height: 160,
              crop: "center",
            })}
            sizes="5rem"
            alt={merchandise.image.altText ?? title}
            className="h-full w-full object-cover"
            width={160}
            height={160}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="type-body-sm text-on-surface font-medium">
          {product?.handle ? <Link href={`/products/${product.handle}`}>{title}</Link> : title}
        </p>
        {options.length > 0 ? (
          <p className="text-on-surface-secondary mt-1 text-xs">
            {options.map((option) => option.value).join(" / ")}
          </p>
        ) : null}
        <p className={`text-on-surface mt-2 text-sm ${pending ? "opacity-50" : ""}`}>
          {formatPrice(line.cost.totalAmount)}
        </p>
        <form
          {...formProps()}
          className="quantity-selector-outlined rounded-input mt-3 inline-flex items-center"
        >
          <button {...register("set")} />
          <input type="hidden" {...register("lineId", { value: line.id })} />
          <button
            type="submit"
            {...register("decrease")}
            className="text-on-surface-secondary hover:text-on-surface inline-flex h-11 w-11 items-center justify-center focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
            aria-label={`Decrease quantity for ${title}`}
          >
            <img src="/icons/icon-minus.svg" alt="" className="size-4" aria-hidden="true" />
          </button>
          <input
            {...register("quantity", { value: line.quantity, interactive: true })}
            className="number-reset text-on-surface h-11 w-12 rounded-none border-0 bg-transparent p-0 text-center text-sm focus-visible:outline-none"
            aria-label={`Quantity for ${title}`}
          />
          <button
            type="submit"
            {...register("increase")}
            className="text-on-surface-secondary hover:text-on-surface inline-flex h-11 w-11 items-center justify-center focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
            aria-label={`Increase quantity for ${title}`}
          >
            <img src="/icons/icon-plus.svg" alt="" className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
      <form {...formProps()}>
        <input type="hidden" {...register("lineId", { value: line.id })} />
        <button
          type="submit"
          {...register("remove")}
          className="text-on-surface-secondary hover:text-on-surface inline-flex h-11 w-11 items-center justify-center rounded"
          aria-label={`Remove ${title}`}
        >
          <img src="/icons/icon-trash.svg" alt="" className="size-5" aria-hidden="true" />
        </button>
      </form>
    </li>
  );
}

export function CartContents({ compact = false }: { compact?: boolean }) {
  const cart = useCart((state) => state.data);
  const loading = useCart((state) => state.loading);
  const lines = cart.lines.nodes as CartLineView[];
  const empty = !loading && lines.length === 0;

  if (loading && lines.length === 0) {
    return <p className="text-on-surface-secondary p-4 text-sm">Loading cart…</p>;
  }

  if (empty) {
    return (
      <div className="p-4">
        <p className="text-on-surface font-medium">Your cart is empty.</p>
        <p className="text-on-surface-secondary mt-2 text-sm">
          Looks like you have not added anything to your cart yet.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "max-w-page px-margin mx-auto w-full"}>
      <ul role="list" className="divide-border divide-y">
        {lines.map((line) => (
          <CartLineItem key={line.id} line={line} />
        ))}
      </ul>
    </div>
  );
}

export function CartSummary() {
  const cart = useCart((state) => state.data);
  const lines = cart.lines.nodes;
  if (lines.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-on-surface text-sm font-medium">Estimated total</span>
        <span className="text-on-surface text-base font-medium">
          {formatPrice(cart.cost.totalAmount)}
        </span>
      </div>
      <p className="text-on-surface-secondary text-xs">Taxes and shipping calculated at checkout</p>
      {cart.checkoutUrl ? (
        <a
          href={cart.checkoutUrl}
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
        >
          Checkout
        </a>
      ) : null}
    </div>
  );
}

export function CartPageClient() {
  const cart = useCart((state) => state.data);

  useEffect(() => {
    publishCartViewed(cart);
  }, [cart]);

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 py-12">
      <div className="max-w-page px-margin mx-auto mb-8">
        <h1 className="type-display text-on-surface">Cart</h1>
      </div>
      <CartContents />
      <div className="max-w-page px-margin mx-auto mt-8">
        <CartSummary />
      </div>
    </main>
  );
}
