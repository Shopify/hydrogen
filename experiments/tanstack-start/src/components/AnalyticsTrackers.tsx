import type { AnalyticsCart } from "@shopify/hydrogen";
import { useCartAnalytics } from "@shopify/hydrogen/react";
import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";

import {
  addAnalyticsConsoleDestination,
  AnalyticsEvent,
  analyticsShop,
  getAnalytics,
} from "~/lib/analytics";
import type { CartStoreData } from "~/lib/cart";

export function AnalyticsTracker() {
  const location = useLocation();
  const pageKey = `${location.pathname}${location.searchStr}`;

  useEffect(() => addAnalyticsConsoleDestination() ?? undefined, []);

  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop: analyticsShop,
    });
  }, [pageKey]);

  return null;
}

export function CartAnalyticsTracker() {
  useCartAnalytics();
  return null;
}

// Moves focus to the main landmark after client-side navigation so keyboard
// and screen-reader users land on the new page content.
export function RouteFocusManager() {
  const location = useLocation();
  const pageKey = `${location.pathname}${location.searchStr}`;

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(id);
  }, [pageKey]);

  return null;
}

function toAnalyticsCart(cart: CartStoreData): AnalyticsCart | null {
  if (!cart.id) return null;

  return {
    id: cart.id,
    updatedAt: cart.updatedAt,
    lines: {
      nodes: cart.lines.nodes.flatMap((line) => {
        const { merchandise } = line;
        if (merchandise.__typename !== "ProductVariant") return [];
        return [
          {
            id: line.id,
            quantity: line.quantity,
            merchandise: {
              id: merchandise.id,
              title: merchandise.title,
              sku: merchandise.sku,
              price: merchandise.price,
              product: {
                id: merchandise.product.id,
                title: merchandise.product.title,
                vendor: merchandise.product.vendor,
                productType: merchandise.product.productType,
                handle: merchandise.product.handle,
              },
            },
          },
        ];
      }),
    },
  };
}

export function publishCartViewed(cart: CartStoreData) {
  const analytics = getAnalytics();
  if (!analytics) return;
  analytics.publish(AnalyticsEvent.CART_VIEWED, {
    cart: toAnalyticsCart(cart),
    url: window.location.href,
    shop: analyticsShop,
  });
}
