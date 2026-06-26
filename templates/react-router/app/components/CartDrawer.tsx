import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { useCart, useCartForm } from "~/lib/cart";
import { closeCartDrawer, configureOpenCartAction, CART_DRAWER_ID } from "~/lib/cart-drawer";
import { formatPrice } from "~/lib/money";

import { publishCartViewed } from "./AnalyticsTrackers";

function CartErrorBanner() {
  const errors = useCart((state) => state.errors);
  const [dismissedAt, setDismissedAt] = useState(0);
  const messages = useMemo(() => {
    const lines = [...errors.lines.values()].flatMap((group) => group.userErrors);
    return [...errors.network, ...errors.cart.userErrors, ...lines].map((error) => error.message);
  }, [errors]);

  if (messages.length === 0 || errors.lastUpdatedAt <= dismissedAt) return null;

  return (
    <div className="border-border bg-surface-secondary mx-4 mb-2 rounded p-3 text-sm" role="alert">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          {messages.map((message) => (
            <p key={message} className="text-critical">
              {message}
            </p>
          ))}
        </div>
        <button
          type="button"
          className="button-ghost focus-visible:outline-accent rounded px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => setDismissedAt(errors.lastUpdatedAt)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

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

export function CartLineItem({ line }: { line: CartLineView }) {
  const { formProps, register } = useCartForm();
  const pendingLines = useCart((state) => state.pending.lines);
  const lineError = useCart((state) => state.errors.lines.get(line.id));
  const merchandise = line.merchandise;
  const product = merchandise?.product;
  const pending = pendingLines.has(line.id);
  const optionText = merchandise?.selectedOptions
    ?.map((option: { name: string; value: string }) => option.value)
    .join(" / ");
  const errorId = `cart-line-error-${line.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <li className="flex gap-3 py-4" data-testid="cart-line">
      <div className="bg-surface-secondary size-20 shrink-0 overflow-hidden">
        {merchandise?.image ? (
          <img
            src={merchandise.image.url}
            alt={merchandise.image.altText ?? product?.title ?? merchandise.title ?? ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="type-body-sm text-on-surface font-medium">
          {product?.handle ? (
            <Link to={`/products/${product.handle}`} className="text-on-surface no-underline">
              {product.title ?? merchandise?.title ?? "Product"}
            </Link>
          ) : (
            (product?.title ?? merchandise?.title ?? "Product")
          )}
        </p>
        {optionText ? <p className="text-on-surface-secondary mt-1 text-xs">{optionText}</p> : null}
        <p className={`text-on-surface mt-2 text-sm ${pending ? "opacity-50" : ""}`}>
          {formatPrice(line.cost.totalAmount)}
        </p>
        <form {...formProps()} className="mt-3 flex items-center gap-2">
          <button {...register("set")} />
          <input type="hidden" {...register("lineId", { value: line.id })} />
          <div className="quantity-selector-outlined rounded-input inline-flex items-center">
            <button
              type="submit"
              {...register("decrease")}
              className="text-on-surface-secondary hover:text-on-surface inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
              aria-label={`Decrease quantity for ${product?.title ?? merchandise?.title ?? "item"}`}
            >
              <img src="/icons/icon-minus.svg" alt="" className="size-4" aria-hidden="true" />
            </button>
            <input
              {...register("quantity", { value: line.quantity, interactive: true })}
              className={`number-reset text-on-surface h-11 w-12 rounded-none border-0 bg-transparent p-0 text-center text-sm ${pending ? "opacity-50" : ""}`}
              aria-label="Quantity"
              aria-describedby={lineError?.userErrors.length ? errorId : undefined}
              aria-invalid={lineError?.userErrors.length ? true : undefined}
            />
            <button
              type="submit"
              {...register("increase")}
              className="text-on-surface-secondary hover:text-on-surface inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
              aria-label={`Increase quantity for ${product?.title ?? merchandise?.title ?? "item"}`}
            >
              <img src="/icons/icon-plus.svg" alt="" className="size-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="submit"
            {...register("remove")}
            className="text-on-surface-secondary hover:text-on-surface inline-flex size-11 items-center justify-center rounded motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
            aria-label={`Remove ${product?.title ?? merchandise?.title ?? "item"}`}
          >
            <img src="/icons/icon-trash.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </form>
        {lineError?.userErrors.length ? (
          <p id={errorId} className="text-critical mt-2 text-sm" role="alert">
            {lineError.userErrors[0]?.message}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function CartLines() {
  const loading = useCart((state) => state.loading);
  const lines = useCart((state) => state.data.lines.nodes);

  if (loading) {
    return <p className="text-on-surface-secondary type-body-sm">Loading cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-on-surface font-medium">Your cart is empty.</p>
        <p className="text-on-surface-secondary mt-2 text-sm">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
      </div>
    );
  }

  return (
    <ul role="list" className="divide-border -mt-4 divide-y">
      {lines.map((line) => (
        <CartLineItem key={line.id} line={line} />
      ))}
    </ul>
  );
}

function CartFooter() {
  const cart = useCart((state) => state.data);
  const hasLines = cart.lines.nodes.length > 0;

  if (!hasLines) return null;

  return (
    <div className="border-border shrink-0 border-t p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-on-surface text-sm font-medium">Estimated total</span>
          <span className="text-on-surface text-base font-medium">
            {formatPrice(cart.cost.totalAmount)}
          </span>
        </div>
        <p className="text-on-surface-secondary text-xs">
          Taxes and shipping calculated at checkout
        </p>
        {cart.checkoutUrl ? (
          <a
            href={cart.checkoutUrl}
            className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          >
            Checkout
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function CartDrawer() {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const cart = useCart((state) => state.data);

  useEffect(() => {
    configureOpenCartAction();
    const dialog = document.getElementById(CART_DRAWER_ID);
    if (!(dialog instanceof HTMLDialogElement)) return;
    const handleToggle = () => {
      if (dialog.open) publishCartViewed(cart);
    };
    dialog.addEventListener("toggle", handleToggle);
    return () => dialog.removeEventListener("toggle", handleToggle);
  }, [cart]);

  return (
    <dialog
      id={CART_DRAWER_ID}
      className="drawer-right bg-surface text-on-surface"
      aria-labelledby="cart-drawer-title"
      data-testid="cart-drawer"
      closedby="any"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center py-2 ps-4">
          <div className="flex flex-1 items-center gap-2">
            <h2 id="cart-drawer-title" className="text-on-surface text-lg font-medium">
              Cart
            </h2>
            <span className="cart-count-badge">{totalQuantity}</span>
          </div>
          <button
            type="button"
            commandfor={CART_DRAWER_ID}
            command="close"
            className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Close"
            onClick={() => closeCartDrawer()}
          >
            <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </div>
        <CartErrorBanner />
        <div className="flex-1 overflow-y-auto p-4">
          <CartLines />
          <span className="sr-only" aria-live="polite" aria-atomic="true" data-cart-status />
        </div>
        <CartFooter />
      </div>
    </dialog>
  );
}
