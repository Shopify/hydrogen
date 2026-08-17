import type { CartStore } from "../cart/cart";
import type { CartData, CartState } from "../cart/state";
import { AnalyticsEvent } from "./events";
import type {
  AnalyticsCart,
  AnalyticsCartLine,
  CartUpdatePayload,
  StorefrontAnalytics,
} from "./types";
import { flattenConnection } from "./utils/flatten-connection";

type CartTrackerAnalytics = Pick<StorefrontAnalytics, "publish" | "getConfig">;
type CartAnalyticsStore = Pick<CartStore, "getState" | "subscribe">;

type CartStorage = {
  updatedAt: string;
  id: string;
};

type CartTrackerState = {
  prevCart: AnalyticsCart | null;
  lastEventId: string | null;
};

export function trackCartAnalytics(store: CartAnalyticsStore): () => void {
  const analytics = getGlobalAnalytics();
  const state: CartTrackerState = {
    prevCart: toAnalyticsCart(store.getState()),
    lastEventId: null,
  };

  if (state.prevCart) syncShopifyCurrency(state.prevCart);

  return store.subscribe((cartState) => {
    const cart = toAnalyticsCart(cartState);
    if (!cart) return;

    trackCartChange(analytics, state, cart);
  });
}

function trackCartChange(
  analytics: CartTrackerAnalytics,
  state: CartTrackerState,
  cart: AnalyticsCart,
): void {
  if (!cart || !cart.updatedAt) return;

  syncShopifyCurrency(cart);

  if (cart.updatedAt === state.prevCart?.updatedAt) return;

  let cartLastUpdatedAt: CartStorage | null;
  try {
    cartLastUpdatedAt = JSON.parse(localStorage.getItem("cartLastUpdatedAt") || "");
  } catch {
    cartLastUpdatedAt = null;
  }

  if (cart.id === cartLastUpdatedAt?.id && cart.updatedAt === cartLastUpdatedAt?.updatedAt) {
    state.prevCart = cart;
    return;
  }

  if (cart.updatedAt === state.lastEventId) return;
  state.lastEventId = cart.updatedAt;

  const config = analytics.getConfig();
  const payload: CartUpdatePayload = {
    eventTimestamp: Date.now(),
    cart,
    prevCart: state.prevCart,
    shop: config.shop,
    customData: config.customData,
  };

  analytics.publish(AnalyticsEvent.CART_UPDATED, payload);

  try {
    localStorage.setItem(
      "cartLastUpdatedAt",
      JSON.stringify({ id: cart.id, updatedAt: cart.updatedAt }),
    );
  } catch {
    // Safari private browsing or storage quota exceeded; analytics
    // deduplication will rely on in-memory prevCart only for this session.
  }

  const previousCartLines = flattenConnection<AnalyticsCartLine>(state.prevCart?.lines);
  const currentCartLines = flattenConnection<AnalyticsCartLine>(cart.lines);

  previousCartLines.forEach((prevLine) => {
    const matchedLineId = currentCartLines.filter((line) => prevLine.id === line.id);
    if (matchedLineId.length === 1) {
      const matchedLine = matchedLineId[0];
      if (prevLine.quantity < matchedLine.quantity) {
        analytics.publish(AnalyticsEvent.PRODUCT_ADD_TO_CART, {
          ...payload,
          prevLine,
          currentLine: matchedLine,
        });
      } else if (prevLine.quantity > matchedLine.quantity) {
        analytics.publish(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, {
          ...payload,
          prevLine,
          currentLine: matchedLine,
        });
      }
    } else {
      analytics.publish(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, {
        ...payload,
        prevLine,
      });
    }
  });

  currentCartLines.forEach((line) => {
    const matchedLineId = previousCartLines.filter((previousLine) => line.id === previousLine.id);
    if (!matchedLineId || matchedLineId.length === 0) {
      analytics.publish(AnalyticsEvent.PRODUCT_ADD_TO_CART, {
        ...payload,
        currentLine: line,
      });
    }
  });

  state.prevCart = cart;
}

function getGlobalAnalytics(): CartTrackerAnalytics {
  const analytics = typeof window !== "undefined" ? window.Shopify?.analytics : undefined;
  if (!analytics) {
    throw new Error(
      "Shopify analytics bus is not available. Render ShopifyScripts before calling trackCartAnalytics().",
    );
  }

  return analytics;
}

function toAnalyticsCart(state: CartState): AnalyticsCart | null {
  const cart = state.data;
  if (!cart.id || hasPendingCartWork(state)) return null;

  return {
    id: cart.id,
    updatedAt: getCartUpdatedAt(cart),
    cost: cart.cost,
    lines: {
      nodes: cart.lines.nodes.flatMap((line): AnalyticsCartLine[] => {
        const merchandise = line.merchandise;
        if (!merchandise) return [];

        const product = merchandise.product;
        const productId = typeof product.id === "string" ? product.id : "";
        const vendor = typeof product.vendor === "string" ? product.vendor : "";
        const productType =
          typeof product.productType === "string" ? product.productType : undefined;

        return [
          {
            id: line.id,
            quantity: line.quantity,
            merchandise: {
              id: merchandise.id,
              title: merchandise.title ?? product.title,
              price: line.cost.amountPerQuantity,
              sku: typeof merchandise.sku === "string" ? merchandise.sku : null,
              product: {
                id: productId,
                title: product.title,
                vendor,
                productType,
                handle: product.handle,
              },
            },
          },
        ];
      }),
    },
  };
}

function hasPendingCartWork({ pending, revalidating }: CartState): boolean {
  const hasPendingCost = pending.cost ?? (pending.lines.size > 0 || pending.discountCodes.size > 0);
  return revalidating === true || hasPendingCost || pending.note || pending.attributes;
}

function getCartUpdatedAt(cart: CartData): string {
  return typeof cart.updatedAt === "string" ? cart.updatedAt : new Date().toISOString();
}

function syncShopifyCurrency(cart: AnalyticsCart): void {
  if (typeof window === "undefined") return;

  const currencyCode = getCartCurrencyCode(cart);
  if (!currencyCode) return;

  const normalizedCurrencyCode = currencyCode.toUpperCase();
  const shopifyWindow: { Shopify?: { currency?: { active: string } } } = window;
  const shopify = (shopifyWindow.Shopify ??= {});
  if (shopify.currency?.active === normalizedCurrencyCode) return;

  shopify.currency = { active: normalizedCurrencyCode };
}

function getCartCurrencyCode(cart: AnalyticsCart): string | undefined {
  return (
    nonEmptyCurrencyCode(cart.cost?.totalAmount?.currencyCode) ??
    nonEmptyCurrencyCode(cart.cost?.subtotalAmount?.currencyCode) ??
    flattenConnection<AnalyticsCartLine>(cart.lines).find(
      (line) => line.merchandise.price.currencyCode,
    )?.merchandise.price.currencyCode
  );
}

function nonEmptyCurrencyCode(currencyCode: string | undefined): string | undefined {
  return currencyCode || undefined;
}
