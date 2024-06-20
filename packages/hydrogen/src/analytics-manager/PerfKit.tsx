import { parseGid, useLoadScript } from "@shopify/hydrogen-react";
import { ShopAnalytics, useAnalytics } from "./AnalyticsProvider";
import { AnalyticsEvent } from "./events";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    PerfKit: {
      navigate: () => void;
      setPageType: (pageType: string) => void;
    };
  }
}

const PERF_KIT_UNSTABLE =
  'https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-unstable.min.js';
// const PERF_KIT_LOCAL = 'http://localhost:3001/shopify-perf-kit.min.js';

export function PerfKit({
  shop,
}: {
  shop: ShopAnalytics,
}) {
  const loadedEvent = useRef(false);
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Internal_Shopify_Perf_Kit');

  const scriptStatus = useLoadScript(
    PERF_KIT_UNSTABLE,
    {
      attributes: {
        id: 'perfkit',
        'data-application': 'hydrogen',
        'data-shop-id': parseGid(shop.shopId).id.toString(),
        'data-storefront-id': shop.hydrogenSubchannelId,
        'data-monorail-region': 'global',
        'data-spa-mode': 'true',
        'data-resource-timing-sampling-rate': '100',
      },
    },
  );

  useEffect(() => {
    if (scriptStatus !== 'done' || loadedEvent.current) return;
    loadedEvent.current = true;

    subscribe(AnalyticsEvent.PAGE_VIEWED, () => {
      window.PerfKit.navigate();
    });
    subscribe(AnalyticsEvent.PRODUCT_VIEWED, () => {
      window.PerfKit.setPageType('product');
    });
    subscribe(AnalyticsEvent.COLLECTION_VIEWED, () => {
      window.PerfKit.setPageType('collection');
    });
    subscribe(AnalyticsEvent.SEARCH_VIEWED, () => {
      window.PerfKit.setPageType('search');
    });
    subscribe(AnalyticsEvent.CART_VIEWED, () => {
      window.PerfKit.setPageType('cart');
    });

    ready();
  }, [subscribe, ready]);
  return null;
}
