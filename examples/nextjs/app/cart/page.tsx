import type { Metadata } from "next";

import { CartCheckoutButton } from "@/components/CartCheckoutButton";
import { CartContent } from "@/components/CartContent";
import { CartViewedTracker } from "@/components/CartViewedTracker";
import { content } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cart",
  description: content.cart.title,
  alternates: { canonical: "/cart" },
  openGraph: {
    title: "Cart — CORE",
    type: "website",
    url: canonicalUrl("/cart"),
  },
};

/**
 * `/cart` — a real server-rendered cart page that is the drawer's no-JS fallback
 * (engineering.md F4 + `notes/cart.md`). Renders `CartContent` (client) INSIDE
 * the root layout's existing `CartProvider` — does **NOT** re-mount
 * `CartProvider` and does **NOT** re-fetch the cart. The root layout's server
 * seed already populates the SSR HTML (the no-JS contract). A per-page second
 * `CartProvider` would create a divergent inner store vs the root-rendered
 * `CartDrawer` — mutations would not reflect across them.
 *
 * `force-dynamic` is not allowed with `cacheComponents: true`; the root layout
 * already makes every route dynamic via `cookies()`/`headers()` in the cart
 * seed. Reachable via the footer `/cart` link (no-JS fallback).
 */
export default function CartPage() {
  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <h1 className="type-display mb-8">{content.cart.title}</h1>

      <div className="mx-auto max-w-2xl">
        <CartContent />
        <CartCheckoutButton />
        <CartViewedTracker />
      </div>
    </div>
  );
}
