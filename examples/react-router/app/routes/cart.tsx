import { useEffect } from "react";
import { useRef } from "react";
import type { MetaFunction } from "react-router";

import { CartContent } from "~/components/CartContent";
import { AnalyticsEvent, getAnalytics } from "~/lib/analytics";
import { useCart } from "~/lib/cart";
import { content } from "~/lib/content";
import { canonicalUrl } from "~/lib/site";

import type { Route } from "./+types/cart";

export const meta: MetaFunction = () => {
  return [
    { title: "Cart — CORE" },
    { name: "description", content: content.cart.title },
    { tagName: "link", rel: "canonical", href: canonicalUrl("/cart") },
    { property: "og:title", content: "Cart — CORE" },
    { property: "og:type", content: "website" },
  ];
};

/**
 * `/cart` route — a real server-rendered cart page that is the drawer's no-JS
 * fallback (engineering.md F4 + `notes/cart.md`). The cart provider is seeded
 * in the root loader, so the first server render is populated. Reuses the same
 * line-item/discount/total components as the drawer (`hydrogen-cart-ui`).
 * Minimal page layout per the plan (decorative cart-page design is deferred).
 */
export default function CartRoute(_: Route.ComponentProps) {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const checkoutUrl = useCart((state) => state.data.checkoutUrl);
  const cart = useCart((state) => state.data);
  const isEmpty = totalQuantity === 0;
  const hasPublishedCartViewRef = useRef(false);
  const publishedCartIdRef = useRef<string | undefined>(undefined);

  // Publish CART_VIEWED when the cart page is viewed (`hydrogen-analytics`).
  useEffect(() => {
    if (hasPublishedCartViewRef.current && publishedCartIdRef.current === cart.id) return;

    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.CART_VIEWED, {
      cart: cart.id ? cart : null,
      prevCart: null,
    });
    hasPublishedCartViewRef.current = true;
    publishedCartIdRef.current = cart.id;
  }, [cart]);

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <h1 className="type-display mb-8">{content.cart.title}</h1>

      <div className="mx-auto max-w-2xl">
        <CartContent />

        {!isEmpty && checkoutUrl ? (
          <div className="border-border mt-6 border-t pt-4">
            <a
              href={checkoutUrl}
              className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full items-center justify-center px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {content.cart.checkout}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
