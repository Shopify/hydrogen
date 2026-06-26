import { useEffect } from "react";

import { publishCartViewed } from "~/components/AnalyticsTrackers";
import { CartLineItem } from "~/components/CartDrawer";
import { useCart } from "~/lib/cart";
import { formatPrice } from "~/lib/money";

import type { Route } from "./+types/cart";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Cart · CORE" }];
}

export default function CartRoute() {
  const cart = useCart((state) => state.data);
  const loading = useCart((state) => state.loading);
  const lines = cart.lines.nodes;

  useEffect(() => {
    publishCartViewed(cart);
  }, [cart]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-page px-margin mx-auto w-full flex-1 py-12"
    >
      <h1 className="type-display text-on-surface mb-8">Cart</h1>
      {loading ? <p className="text-on-surface-secondary">Loading cart…</p> : null}
      {!loading && lines.length === 0 ? (
        <div>
          <p className="text-on-surface font-medium">Your cart is empty.</p>
          <p className="text-on-surface-secondary mt-2 text-sm">
            Looks like you haven&apos;t added anything to your cart yet.
          </p>
        </div>
      ) : null}
      {lines.length > 0 ? (
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <ul role="list" className="divide-border divide-y">
            {lines.map((line) => (
              <CartLineItem key={line.id} line={line} />
            ))}
          </ul>
          <aside className="border-border h-fit rounded border p-4" aria-label="Cart summary">
            <div className="flex items-center justify-between">
              <span className="text-on-surface text-sm font-medium">Estimated total</span>
              <span className="text-on-surface text-base font-medium">
                {formatPrice(cart.cost.totalAmount)}
              </span>
            </div>
            <p className="text-on-surface-secondary mt-3 text-xs">
              Taxes and shipping calculated at checkout
            </p>
            {cart.checkoutUrl ? (
              <a
                href={cart.checkoutUrl}
                className="rounded-button button-primary focus-visible:outline-accent mt-4 inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
              >
                Checkout
              </a>
            ) : null}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
