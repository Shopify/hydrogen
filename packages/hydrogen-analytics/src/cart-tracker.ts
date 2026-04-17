import {flattenConnection} from './utils/flatten-connection';
import {AnalyticsEvent} from './events';
import type {
  AnalyticsCart,
  AnalyticsCartLine,
  CartUpdatePayload,
  ShopAnalytics,
} from './types';

type PublishFn = (event: string, payload: any) => void;

type CartTrackerDeps = {
  publish: PublishFn;
  getShop: () => ShopAnalytics | null;
  getCustomData: () => Record<string, unknown> | undefined;
};

type CartStorage = {
  updatedAt: string;
  id: string;
};

export function createCartTracker(deps: CartTrackerDeps) {
  let prevCart: AnalyticsCart | null = null;
  let lastEventId: string | null = null;

  function updateCart(cart: AnalyticsCart | null) {
    if (!cart || !cart.updatedAt) return;
    if (cart.updatedAt === prevCart?.updatedAt) return;

    let cartLastUpdatedAt: CartStorage | null;
    try {
      cartLastUpdatedAt = JSON.parse(
        localStorage.getItem('cartLastUpdatedAt') || '',
      );
    } catch {
      cartLastUpdatedAt = null;
    }

    if (
      cart.id === cartLastUpdatedAt?.id &&
      cart.updatedAt === cartLastUpdatedAt?.updatedAt
    ) {
      prevCart = cart;
      return;
    }

    if (cart.updatedAt === lastEventId) return;
    lastEventId = cart.updatedAt;

    const payload: CartUpdatePayload = {
      eventTimestamp: Date.now(),
      cart,
      prevCart,
      shop: deps.getShop(),
      customData: deps.getCustomData(),
    };

    deps.publish(AnalyticsEvent.CART_UPDATED, payload);

    try {
      localStorage.setItem(
        'cartLastUpdatedAt',
        JSON.stringify({id: cart.id, updatedAt: cart.updatedAt}),
      );
    } catch {
      // Safari private browsing or storage quota exceeded — analytics
      // deduplication will rely on in-memory prevCart only for this session.
    }

    const previousCartLines = flattenConnection<AnalyticsCartLine>(
      prevCart?.lines,
    );
    const currentCartLines = flattenConnection<AnalyticsCartLine>(cart.lines);

    previousCartLines.forEach((prevLine) => {
      const matchedLineId = currentCartLines.filter(
        (line) => prevLine.id === line.id,
      );
      if (matchedLineId.length === 1) {
        const matchedLine = matchedLineId[0];
        if (prevLine.quantity < matchedLine.quantity) {
          deps.publish(AnalyticsEvent.PRODUCT_ADD_TO_CART, {
            ...payload,
            prevLine,
            currentLine: matchedLine,
          });
        } else if (prevLine.quantity > matchedLine.quantity) {
          deps.publish(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, {
            ...payload,
            prevLine,
            currentLine: matchedLine,
          });
        }
      } else {
        deps.publish(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, {
          ...payload,
          prevLine,
        });
      }
    });

    currentCartLines.forEach((line) => {
      const matchedLineId = previousCartLines.filter(
        (previousLine) => line.id === previousLine.id,
      );
      if (!matchedLineId || matchedLineId.length === 0) {
        deps.publish(AnalyticsEvent.PRODUCT_ADD_TO_CART, {
          ...payload,
          currentLine: line,
        });
      }
    });

    prevCart = cart;
  }

  function getPrevCart() {
    return prevCart;
  }

  return {updateCart, getPrevCart};
}