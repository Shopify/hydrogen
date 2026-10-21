import {
  AnalyticsEvent,
  type AnalyticsCart,
  type CartData,
  type CartState,
  type CartStore,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

/** The consent-aware analytics bus that Shopify's scripts create. */
export function getAnalytics(): StorefrontAnalytics | null {
  if (!globalThis.window) return null;
  return window.Shopify?.analytics ?? null;
}

/** Publishes one page view per URL, so hydration and reloads don't double count. */
export function createPageViewPublisher(): () => void {
  let lastUrl: string | undefined;
  return () => {
    const url = window.location.href;
    const bus = getAnalytics();
    if (!bus || url === lastUrl) return;
    bus.publish(AnalyticsEvent.PAGE_VIEWED, { url });
    lastUrl = url;
  };
}

/** Publishes a cart view from settled cart state, never from an optimistic projection. */
export function publishCartViewed(store: CartStore): void {
  const bus = getAnalytics();
  if (!bus) return;

  const publish = () => {
    bus.publish(AnalyticsEvent.CART_VIEWED, { cart: toAnalyticsCart(store.getState().data) });
  };
  if (!hasPendingCartWork(store.getState())) return publish();

  const unsubscribe = store.subscribe((state) => {
    if (hasPendingCartWork(state)) return;
    unsubscribe();
    publish();
  });
}

function hasPendingCartWork(state: CartState): boolean {
  return Boolean(
    state.loading ||
    state.revalidating ||
    state.pending.cost ||
    state.pending.lines.size ||
    state.pending.discountCodes.size ||
    state.pending.note ||
    state.pending.attributes,
  );
}

function toAnalyticsCart(cart: CartData): AnalyticsCart | null {
  if (!cart.id || !cart.updatedAt) return null;

  return {
    id: cart.id,
    updatedAt: cart.updatedAt,
    cost: cart.cost,
    lines: {
      nodes: cart.lines.nodes.flatMap((line) => {
        const merchandise = line.merchandise;
        if (!merchandise) return [];
        return [
          {
            id: line.id,
            quantity: line.quantity,
            merchandise: {
              id: merchandise.id,
              title: merchandise.title ?? merchandise.product.title,
              price: line.cost.amountPerQuantity,
              sku: typeof merchandise.sku === "string" ? merchandise.sku : null,
              product: {
                id: String(merchandise.product.id),
                title: merchandise.product.title,
                vendor: String(merchandise.product.vendor ?? ""),
                productType:
                  typeof merchandise.product.productType === "string"
                    ? merchandise.product.productType
                    : undefined,
                handle: merchandise.product.handle,
              },
            },
          },
        ];
      }),
    },
  };
}
