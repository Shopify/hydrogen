"use client";

import type { AnalyticsCart, ConsentConfig, ShopAnalytics } from "@shopify/hydrogen";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import {
  AnalyticsEvent,
  configureAnalytics,
  getAnalytics,
  getAnalyticsShop,
} from "../lib/analytics";
import { useCart } from "../lib/cart";

declare global {
  interface Window {
    __analyticsEvents?: Array<{ event: string; payload: Record<string, unknown> }>;
  }
}

const TEST_TAP_EVENTS = [
  AnalyticsEvent.PAGE_VIEWED,
  AnalyticsEvent.PRODUCT_VIEWED,
  AnalyticsEvent.COLLECTION_VIEWED,
  AnalyticsEvent.CART_VIEWED,
  AnalyticsEvent.SEARCH_VIEWED,
  AnalyticsEvent.CART_UPDATED,
  AnalyticsEvent.PRODUCT_ADD_TO_CART,
  AnalyticsEvent.PRODUCT_REMOVED_FROM_CART,
] as const;

function recordFrom(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberFrom(value: unknown) {
  return typeof value === "number" ? value : 0;
}

export function toAnalyticsCart(cart: unknown): AnalyticsCart | null {
  const source = recordFrom(cart);
  const id = stringFrom(source?.id);
  const updatedAt = stringFrom(source?.updatedAt);
  if (!id || !updatedAt) return null;

  const lineConnection = recordFrom(source?.lines);
  const nodes = Array.isArray(lineConnection?.nodes) ? lineConnection.nodes : [];
  const analyticsLines = nodes.flatMap((line) => {
    const lineRecord = recordFrom(line);
    const merchandise = recordFrom(lineRecord?.merchandise);
    const product = recordFrom(merchandise?.product);
    const cost = recordFrom(lineRecord?.cost);
    const amountPerQuantity = recordFrom(cost?.amountPerQuantity);
    const merchandiseId = stringFrom(merchandise?.id);
    const productId = stringFrom(product?.id);
    if (!lineRecord || !merchandise || !product || !merchandiseId || !productId) return [];

    return [
      {
        id: stringFrom(lineRecord.id),
        quantity: numberFrom(lineRecord.quantity),
        merchandise: {
          id: merchandiseId,
          title: stringFrom(merchandise.title),
          price: {
            amount: stringFrom(amountPerQuantity?.amount),
            currencyCode: stringFrom(amountPerQuantity?.currencyCode),
          },
          sku: stringFrom(merchandise.sku) || null,
          product: {
            id: productId,
            title: stringFrom(product.title),
            vendor: stringFrom(product.vendor),
            productType: stringFrom(product.productType),
            handle: stringFrom(product.handle),
          },
        },
      },
    ];
  });

  return {
    ...source,
    id,
    updatedAt,
    lines: { nodes: analyticsLines },
  };
}

export function AnalyticsTracker({
  shop,
  consent,
  enableTestTap,
}: {
  shop: ShopAnalytics;
  consent: ConsentConfig;
  enableTestTap: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    configureAnalytics(shop, consent);
    const analytics = getAnalytics();
    if (!analytics) return;

    const unsubs = enableTestTap
      ? TEST_TAP_EVENTS.map((event) =>
          analytics.subscribe(event, (payload) => {
            window.__analyticsEvents ??= [];
            window.__analyticsEvents.push({ event, payload: payload as Record<string, unknown> });
          }),
        )
      : [];

    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop,
    });

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [pageKey, shop, consent, enableTestTap]);

  return null;
}

export function CartAnalyticsTracker() {
  const cart = useCart((state) => state.data);
  const analyticsCart = useMemo(() => toAnalyticsCart(cart), [cart]);

  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.updateCart(analyticsCart);
  }, [analyticsCart]);

  return null;
}

export function publishCartViewed(cart: unknown) {
  const analytics = getAnalytics();
  const shop = getAnalyticsShop();
  if (!analytics || !shop) return;

  analytics.publish(AnalyticsEvent.CART_VIEWED, {
    cart: toAnalyticsCart(cart),
    prevCart: null,
    url: window.location.href,
    shop,
  });
}

export function CollectionViewedTracker({
  collection,
}: {
  collection: { id: string; handle: string };
}) {
  useEffect(() => {
    const analytics = getAnalytics();
    const shop = getAnalyticsShop();
    if (!analytics || !shop) return;

    analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: { id: collection.id, handle: collection.handle },
      url: window.location.href,
      shop,
    });
  }, [collection.id, collection.handle]);

  return null;
}

export function SearchViewedTracker({
  searchTerm,
  totalCount,
}: {
  searchTerm: string;
  totalCount: number;
}) {
  useEffect(() => {
    if (!searchTerm) return;

    let cancelled = false;
    let timer: number | undefined;

    function publishWhenReady() {
      if (cancelled) return;
      const analytics = getAnalytics();
      const shop = getAnalyticsShop();
      if (!analytics || !shop) {
        timer = window.setTimeout(publishWhenReady, 50);
        return;
      }

      analytics.publish(AnalyticsEvent.SEARCH_VIEWED, {
        searchTerm,
        searchResults: { totalCount },
        url: window.location.href,
        shop,
      });
    }

    publishWhenReady();

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [searchTerm, totalCount]);

  return null;
}

export function ProductViewedTracker({
  product,
  selectedVariant,
}: {
  product: {
    id: string;
    title: string;
    handle: string;
    vendor?: string | null;
    priceRange?: { minVariantPrice: { amount: string } } | null;
    selectedOrFirstAvailableVariant?: {
      id: string;
      title: string;
      price: { amount: string };
      sku?: string | null;
    } | null;
  };
  selectedVariant?: {
    id: string;
    title: string;
    price: { amount: string };
    sku?: string | null;
  } | null;
}) {
  const variant = selectedVariant ?? product.selectedOrFirstAvailableVariant ?? null;
  const productKey = `${product.handle}:${variant?.id ?? ""}`;

  useEffect(() => {
    const analytics = getAnalytics();
    const shop = getAnalyticsShop();
    if (!analytics || !shop) return;

    analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price: variant?.price.amount ?? product.priceRange?.minVariantPrice.amount ?? "0",
          vendor: product.vendor ?? "",
          variantId: variant?.id ?? product.id,
          variantTitle: variant?.title ?? product.title,
          quantity: 1,
          sku: variant?.sku,
        },
      ],
      url: window.location.href,
      shop,
    });
  }, [product, variant, productKey]);

  return null;
}
