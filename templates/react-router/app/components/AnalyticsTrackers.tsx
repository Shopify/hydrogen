import type { AnalyticsCart, ConsentConfig, ShopAnalytics } from "@shopify/hydrogen";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import {
  AnalyticsEvent,
  configureAnalytics,
  getAnalytics,
  getAnalyticsShop,
} from "~/lib/analytics";
import { useCart } from "~/lib/cart";

type AnalyticsTapWindow = Window & {
  __analyticsEvents?: Array<{ event: string; payload: Record<string, unknown> }>;
};

const TAP_EVENTS = [
  AnalyticsEvent.PAGE_VIEWED,
  AnalyticsEvent.PRODUCT_VIEWED,
  AnalyticsEvent.COLLECTION_VIEWED,
  AnalyticsEvent.CART_VIEWED,
  AnalyticsEvent.SEARCH_VIEWED,
  AnalyticsEvent.CART_UPDATED,
  AnalyticsEvent.PRODUCT_ADD_TO_CART,
  AnalyticsEvent.PRODUCT_REMOVED_FROM_CART,
] as const;

export function AnalyticsTracker({
  shop,
  consent,
  enableTestTap,
}: {
  shop: ShopAnalytics;
  consent: ConsentConfig;
  enableTestTap: boolean;
}) {
  const location = useLocation();
  const pageKey = `${location.pathname}${location.search}`;
  const tapConfigured = useRef(false);

  useEffect(() => {
    configureAnalytics(shop, consent);
    const analytics = getAnalytics();
    if (!analytics) return;

    if (enableTestTap && !tapConfigured.current) {
      tapConfigured.current = true;
      const win = window as AnalyticsTapWindow;
      win.__analyticsEvents ??= [];
      for (const event of TAP_EVENTS) {
        analytics.subscribe(event, (payload) => {
          win.__analyticsEvents?.push({ event, payload: payload as Record<string, unknown> });
        });
      }
    }

    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop,
    });
  }, [pageKey, shop, consent, enableTestTap]);

  return null;
}

function toAnalyticsCart(cart: unknown): AnalyticsCart | null {
  const candidate = cart as {
    id?: string | null;
    updatedAt?: string;
    lines?: {
      nodes?: Array<{
        id: string;
        quantity: number;
        cost?: { amountPerQuantity?: { amount: string; currencyCode?: string } };
        merchandise?: {
          id?: string;
          title?: string;
          sku?: string | null;
          product?: {
            id?: string;
            title?: string;
            vendor?: string;
            productType?: string;
            handle?: string;
          };
        };
      }>;
    };
  };

  if (!candidate.id || !candidate.updatedAt) return null;

  return {
    id: candidate.id,
    updatedAt: candidate.updatedAt,
    lines: {
      nodes: (candidate.lines?.nodes ?? []).flatMap((line) => {
        const merchandise = line.merchandise;
        const product = merchandise?.product;
        const price = line.cost?.amountPerQuantity;
        if (!merchandise?.id || !product?.id || !product.title || !product.vendor || !price) {
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
              price,
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
  const cart = useCart((state) => state.data);
  const analyticsKey = `${cart.id ?? ""}:${String(cart.updatedAt ?? "")}`;

  useEffect(() => {
    const analyticsCart = toAnalyticsCart(cart);
    if (!analyticsCart) return;
    getAnalytics()?.updateCart(analyticsCart);
  }, [analyticsKey, cart]);

  return null;
}

export function publishCartViewed(cart: unknown) {
  const analytics = getAnalytics();
  if (!analytics) return;
  analytics.publish(AnalyticsEvent.CART_VIEWED, {
    cart: toAnalyticsCart(cart),
    prevCart: null,
    url: window.location.href,
    shop: getAnalyticsShop(),
  });
}
