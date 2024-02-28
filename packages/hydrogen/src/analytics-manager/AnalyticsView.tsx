import { useLocation } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { useAnalyticsProvider } from "./AnalyticsProvider";

type OtherData = {
  [key: string]: unknown;
};

type PageViewProps = {
  eventName: 'page_viewed';
  payload?: OtherData;
};

type ProductViewProps = {
  eventName: 'product_viewed';
  payload: {
    product: {
      id: string,
      title: string,
      handle: string,
    },
    [key: string]: unknown,
  } & OtherData;
};

type CollectionViewProps = {
  eventName: 'collection_viewed';
  payload: {
    collection: {
      id: string,
    },
  } & OtherData;
}

type CartViewProps = {
  eventName: 'cart_viewed';
  payload?: OtherData;
};

type CustomViewProps = {
  eventName: `custom_${string}`;
  payload?: OtherData;
};

type AnalyticsViewProps =
  | PageViewProps
  | ProductViewProps
  | CollectionViewProps
  | CartViewProps
  | CustomViewProps;

export function AnalyticsView({
  eventName,
  payload,
}: AnalyticsViewProps) {
  const location = useLocation();
  const lastLocationPathname = useRef<string>('');
  const {publish} = useAnalyticsProvider();
  const url = location.pathname + location.search;

  // Page view analytics
  // We want useEffect to execute only when location changes
  // which represents a page view
  useEffect(() => {
    if (lastLocationPathname.current === url) return;

    lastLocationPathname.current = url;

    const viewPayload = {
      url: window.location.href,
      ...payload,
    };

    setTimeout(() => {
      publish(eventName, viewPayload);
    }, 500);
  }, [url]);

  return null;
}

AnalyticsView.PAGE_VIEWED = 'page_viewed' as const;
AnalyticsView.PRODUCT_VIEWED = 'product_viewed' as const;
AnalyticsView.COLLECTION_VIEWED = 'collection_viewed' as const;
AnalyticsView.CART_VIEWED = 'cart_viewed' as const;
