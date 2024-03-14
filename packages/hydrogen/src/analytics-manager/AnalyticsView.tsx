import { useLocation } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { type ShopAnalytic, type AnalyticsProviderProps, useAnalyticsProvider } from "./AnalyticsProvider";
import { CartReturn } from "../cart/queries/cart-types";
import {AnalyticsEvent} from './events';
import { Product, ProductVariant } from "@shopify/hydrogen-react/storefront-api-types";

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
  products: Array<{
    id: Product['id']
    title: Product['title'],
    price: ProductVariant['price']['amount'],
    vendor: Product['vendor'],
    variantId: ProductVariant['id'],
    variantTitle: ProductVariant['title'],
    quantity: number,
    sku?: ProductVariant['sku'],
    productType?: Product['productType'],
    [key: string]: unknown,
  }>,
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
  cart: CartReturn | null;
  prevCart: CartReturn | null;
} & BasePayload;

export type CustomEventPayload = {
  [key: string]: unknown;
} & BasePayload;

export type EventPayloads = PageViewPayload |
  ProductViewPayload |
  CollectionViewPayload |
  CartViewPayload |
  CartUpdatePayload |
  CustomEventPayload;

export type EventTypes = typeof AnalyticsEvent['PAGE_VIEWED'] |
  typeof AnalyticsEvent['PRODUCT_VIEWED'] |
  typeof AnalyticsEvent['COLLECTION_VIEWED'] |
  typeof AnalyticsEvent['CART_VIEWED'] |
  typeof AnalyticsEvent['CART_UPDATED'] |
  typeof AnalyticsEvent['CUSTOM_EVENT'];

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
  const {type, payload = {}} = props;
  const location = useLocation();
  const lastLocationPathname = useRef<string>('');
  const {publish, cart, prevCart, shop} = useAnalyticsProvider();
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

    publish(type, viewPayload);
  }, [publish, url, cart, prevCart, shop]);

  return null;
}
