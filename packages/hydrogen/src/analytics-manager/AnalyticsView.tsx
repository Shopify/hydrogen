import { useLocation } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { type ShopAnalytic, type AnalyticsProviderProps, useAnalyticsProvider } from "./AnalyticsProvider";
import { CartReturn } from "../cart/queries/cart-types";
import {AnalyticsEvent} from './events';

export type OtherData = {
  [key: string]: unknown;
};

export type BasePayload = {
  eventTimestamp: number;
  shop: ShopAnalytic | null;
  customPayload: AnalyticsProviderProps['customPayload'];
};

// Event payloads
export type CollectionViewPayload = {
  collection: {
    id: string;
  };
} & BasePayload;

export type ProductViewPayload = {
  product: {
    id: string;
    title: string;
    handle: string;
  };
} & BasePayload;

export type CartViewPayload = {
  cart: CartReturn | null;
  prevCart: CartReturn | null;
} & BasePayload;

export type PageViewPayload = {
  url: string;
  cart: CartReturn | null;
  prevCart: CartReturn | null;
} & BasePayload;

export type CartUpdatePayload = {
  cart: CartReturn;
  prevCart: CartReturn;
} & BasePayload;

export type CustomEventPayload = {
  [key: string]: unknown;
} & BasePayload;

// Event types
type PageViewProps = {
  type: typeof AnalyticsEvent.PAGE_VIEWED;
  payload?: OtherData;
};

type ProductViewProps = {
  type: typeof AnalyticsEvent.PRODUCT_VIEWED;
  payload: ProductViewPayload
};

type CollectionViewProps = {
  type: typeof AnalyticsEvent.COLLECTION_VIEWED;
  payload: CollectionViewPayload;
}

type CartViewProps = {
  type: typeof AnalyticsEvent.CART_VIEWED;
  payload?: CartViewPayload;
};

type CustomViewProps = {
  type: typeof AnalyticsEvent.CUSTOM_EVENT;
  payload?: OtherData;
};

export function AnalyticsView(props: PageViewProps): null;
export function AnalyticsView(props: ProductViewProps): null;
export function AnalyticsView(props: CollectionViewProps): null;
export function AnalyticsView(props: CartViewProps): null;
export function AnalyticsView(props: CustomViewProps): null;
export function AnalyticsView(props: any) {
  const { type, payload = {} } = props;
  const location = useLocation();
  const lastLocationPathname = useRef<string>('');
  const {publish, cart, prevCart, shop, canTrack} = useAnalyticsProvider();
  const url = location.pathname + location.search;

  // Publish page_viewed events when the URL changes
  useEffect(() => {
    if (lastLocationPathname.current === url) return;

    // don't publish the event until we have the shop
    if (!shop) return;

    const viewPayload: PageViewPayload = {
      ...payload,
      url: window.location.href,
      cart,
      prevCart,
      shop,
    };

    lastLocationPathname.current = url;

    console.log('PageView', canTrack)

    if (canTrack()) {
      publish(type, viewPayload);
    } else {
      // eslint-disable-next-line no-console
      console.warn('AnalyticsView - User has not consented to tracking');
    }
  }, [canTrack, publish, url, cart, prevCart, shop]);

  return null;
}
