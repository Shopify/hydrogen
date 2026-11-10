import { AnalyticsEvent, type AnalyticsCart } from "@shopify/hydrogen";
import { useCartAnalytics } from "@shopify/hydrogen/react";
import { useEffect } from "react";
import { useLocation } from "react-router";

import type { CartData } from "~/lib/cart";

export function PageViewedTracker() {
  const location = useLocation();
  const pageKey = `${location.pathname}${location.search}`;

  useEffect(() => {
    window.Shopify?.analytics?.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [pageKey]);

  return null;
}

function toAnalyticsCart(cart: CartData): AnalyticsCart | null {
  if (!cart.id || !cart.updatedAt) return null;

  return {
    id: cart.id,
    updatedAt: cart.updatedAt,
    lines: {
      nodes: cart.lines.nodes.flatMap((line) => {
        const merchandise = line.merchandise;
        const product = merchandise?.product;
        // Optimistic lines may not have product details yet.
        if (!merchandise?.id || !product?.id || !product.title || !product.vendor) {
          return [];
        }
        return [
          {
            id: line.id,
            quantity: line.quantity,
            merchandise: {
              id: merchandise.id,
              title: merchandise.title ?? product.title,
              sku: merchandise.sku,
              price: line.cost.amountPerQuantity,
              product: {
                id: product.id,
                title: product.title,
                vendor: product.vendor,
                productType: product.productType,
                handle: product.handle,
              },
            },
          },
        ];
      }),
    },
  };
}

export function CartAnalyticsTracker() {
  useCartAnalytics();
  return null;
}

export function publishCartViewed(cart: CartData) {
  window.Shopify?.analytics?.publish(AnalyticsEvent.CART_VIEWED, {
    cart: toAnalyticsCart(cart),
  });
}
