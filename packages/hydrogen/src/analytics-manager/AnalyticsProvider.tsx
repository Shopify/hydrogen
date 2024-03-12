import { type ReactNode, useEffect, useState , useMemo, useCallback, createContext, useContext, useRef } from "react";
import { type CartReturn } from "../cart/queries/cart-types";
import {
  AnalyticsView,
  type PageViewPayload,
  type ProductViewPayload,
  type CollectionViewPayload,
  type CartViewPayload,
  type CartUpdatePayload,
  type CustomEventPayload,
  type OtherData
} from "./AnalyticsView";
import { type CurrencyCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import {AnalyticsEvent} from "./events";

export type ShopAnalytic = {
  [key: string]: unknown;
  shopId: string;
  acceptedLanguage: LanguageCode | undefined;
  currency: CurrencyCode;
  hydrogenSubchannelId: string | '0',
}

export type AnalyticsProviderProps = {
  /** React children to render. */
  children?: ReactNode;
  /** The cart or cart promise to track. */
  cart: Promise<CartReturn | null> | CartReturn | null;
  /** An optional function to set wether the user can be tracked. */
  canTrack?: () => boolean;

  /** The optional customer object to pass to events **/
  // TODO: Need to solve for this
  // customer?: Promise<CustomerReturn | null> | CustomerReturn | null;

  /** An optional custom payload to pass to all events. e.g language/locale/currency */
  customPayload?: Record<string, unknown>;

  /** Enable consent and evnets publishing logs */
  debug?: boolean;

  // TODO: pass generic Promise<ShopAnalytic | null> | ShopAnalytic | null;
  shop: Promise<ShopAnalytic | null> | ShopAnalytic | null;
}


type AnalyticsContextValue = {
  canTrack: NonNullable<AnalyticsProviderProps['canTrack']>;
  cart: Awaited<AnalyticsProviderProps['cart']>;
  customPayload: AnalyticsProviderProps['customPayload'];
  debug?: AnalyticsProviderProps['debug'];
  prevCart: Awaited<AnalyticsProviderProps['cart']>;
  publish: typeof publish;
  shop: Awaited<AnalyticsProviderProps['shop']>;
  subscribe: typeof subscribe;
}

export const defaultAnalyticsContext: AnalyticsContextValue = {
  canTrack: () => false,
  cart: null,
  customPayload: {},
  debug: false,
  prevCart: null,
  publish: () => { },
  shop: null,
  subscribe: () => { },
};

const AnalyticsContext = createContext<AnalyticsContextValue>(
  defaultAnalyticsContext,
);

const subscribers = new Map<string, Map<String, (payload: Record<string, unknown>) => void>>();

// Overload functions for each subscribe event
function subscribe(
  event: typeof AnalyticsEvent.PAGE_VIEWED,
  callback: (payload: PageViewPayload) => void
): void;

function subscribe(
  event: typeof AnalyticsEvent.PRODUCT_VIEWED,
  callback: (payload: ProductViewPayload) => void
): void;

function subscribe(
  event: typeof AnalyticsEvent.COLLECTION_VIEWED,
  callback: (payload: CollectionViewPayload) => void
): void;

function subscribe(
  event: typeof AnalyticsEvent.CART_VIEWED,
  callback: (payload: CartViewPayload) => void
): void;

function subscribe(
  event: typeof AnalyticsEvent.CART_UPDATED,
  callback: (payload: CartUpdatePayload) => void
): void;

function subscribe(
  event: typeof AnalyticsEvent.CUSTOM_EVENT,
  callback: (payload: CustomEventPayload) => void
): void;

// TODO: should be any any or string and a default callback function?
function subscribe(
  event: any,
  callback: any
) {
  if (!subscribers.has(event)) {
    subscribers.set(event, new Map());
  }
  subscribers.get(event)?.set(callback.toString(), callback);
}

function publish(event: typeof AnalyticsEvent.PAGE_VIEWED, payload: PageViewPayload): void;
function publish(event: typeof AnalyticsEvent.PRODUCT_VIEWED, payload: ProductViewPayload): void;
function publish(event: typeof AnalyticsEvent.COLLECTION_VIEWED, payload: CollectionViewPayload): void;
function publish(event: typeof AnalyticsEvent.CART_VIEWED, payload: CartViewPayload): void;
function publish(event: typeof AnalyticsEvent.CART_UPDATED, payload: CartUpdatePayload): void;
function publish(event: typeof AnalyticsEvent.CUSTOM_EVENT, payload: OtherData): void;
function publish(event: string,  payload: Record<string, unknown>): void {
  (subscribers.get(event) ?? new Map()).forEach((callback) => {
    try {
      callback(payload);
    } catch (error) {
      if (typeof error === 'object' && error instanceof Error) {
        console.error('Analytics publish error', error.message);
      } else {
        console.error('Analytics publish error', error);
      }
    }
  });
}

export function AnalyticsProvider({
  children,
  canTrack: customCanTrack,
  customPayload = {},
  cart: currentCart,
  shop: shopProp = null,
  debug = false,
}: AnalyticsProviderProps): JSX.Element {
  const {cart, prevCart} = useCartAnalytics(currentCart)
  const {shop} = useShopAnalytics(shopProp);

  // This functions attempts to automatically determine if the user can be tracked if the
  // customer privacy API is available. If not, it will default to false.
  function shopifyCanTrack() {
    if (
      typeof window !== 'undefined' &&
      typeof window?.Shopify === 'object' &&
      typeof window?.Shopify?.customerPrivacy === 'object' &&
      typeof window?.Shopify?.customerPrivacy?.userCanBeTracked === 'function'
    ) {
      return window.Shopify.customerPrivacy.userCanBeTracked();
    }
    return false;
  }

  const canTrack = customCanTrack ?? shopifyCanTrack

  const value = useMemo<AnalyticsContextValue>(() => ({
    debug,
    canTrack,
    cart,
    customPayload,
    prevCart,
    publish,
    shop,
    subscribe
  }), [debug, canTrack, cart?.updatedAt, prevCart, publish, subscribe, customPayload, shop]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
      <AnalyticsView type="page_viewed" />
    </AnalyticsContext.Provider>
  );
};

export function useAnalyticsProvider() {
  const analyticsContext = useContext(AnalyticsContext);
  if (!analyticsContext) {
    throw new Error(`'useAnalyticsProvider()' must be a descendent of <AnalyticsProvider/>`);
  }
  return analyticsContext;
}

/**
 * A hook to track both the cart and previous cart and publish cart_updated events.
**/
function useCartAnalytics(currentCart : AnalyticsProviderProps['cart']) {
  const {publish, shop, customPayload, canTrack} = useAnalyticsProvider();
  const prevCartRef = useRef<Awaited<AnalyticsProviderProps['cart']>>(null);
  const [cart, setCart] = useState<Awaited<AnalyticsProviderProps['cart']>>(null);

  // resolve the cart that could have been deferred
  useEffect(() => {
    if (!currentCart) return;
    Promise.resolve(currentCart).then(setCart);
    return () => {};
  }, [setCart, currentCart]);

  useEffect(() => {
    if (!cart) return;
    if (cart?.updatedAt === prevCartRef.current?.updatedAt) return;

    const payload: CartUpdatePayload = {
      eventTimestamp: Date.now(),
      cart: cart,
      prevCart: JSON.parse(JSON.stringify(prevCartRef.current)) as CartReturn,
      shop,
      customPayload,
    };

    console.log('useCart', canTrack)

    if (canTrack()) {
      publish('cart_updated', payload)
    } else {
      // eslint-disable-next-line no-console
      console.warn('Analytics - cart_updated event not sent because user cannot be tracked');
    }

    prevCartRef.current = cart;
  }, [canTrack, publish, cart?.updatedAt, prevCartRef, shop, customPayload]);

  return {cart, prevCart: prevCartRef.current};
}

/**
 * A hook that resolves the shop analytics that could have been deferred
 * and returns the shop analytics.
 */
function useShopAnalytics(shopProp: AnalyticsProviderProps['shop']): {shop: ShopAnalytic | null} {
  const [shop, setShop] = useState<Awaited<AnalyticsProviderProps['shop']>>(null);

  // resolve the shop analytics that could have been deferred
  useEffect(() => {
    Promise.resolve(shopProp).then(setShop);
    return () => {};
  }, [setShop, shopProp]);

  return {shop};
}
