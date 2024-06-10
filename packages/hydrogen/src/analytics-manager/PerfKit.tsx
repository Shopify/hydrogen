import { parseGid, useLoadScript } from "@shopify/hydrogen-react";
import { ShopAnalytics, useAnalytics } from "./AnalyticsProvider";
import { AnalyticsEvent } from "./events";
import { useEffect, useRef } from "react";

const PERF_KIT_UNSTABLE =
  'https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-unstable.min.js';
const PERF_KIT_LOCAL = 'http://localhost:3001/shopify-perf-kit.min.js';

export function PerfKit({
  shop,
}: {
  shop: ShopAnalytics,
}) {
  const loadedEvent = useRef(false);
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Internal_Shopify_Perf_Kit');

  const scriptStatus = useLoadScript(
    PERF_KIT_LOCAL,
    {
      attributes: {
        id: 'perfkit',
        'data-application': 'hydrogen',
        'data-shop-id': parseGid(shop.shopId).id.toString(),
        'data-storefront-id': shop.hydrogenSubchannelId,
        'data-monorail-region': 'global',
      },
    },
  );

  useEffect(() => {
    if (scriptStatus !== 'done' || loadedEvent.current) return;
    loadedEvent.current = true;

    subscribe(AnalyticsEvent.PAGE_VIEWED, (data) => {
      console.log('PerfKit - Page viewed', data);
    });
    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (data) => {
      console.log('PerfKit - Product viewed', data);
      // call perfkit to set page type
    });
    subscribe(AnalyticsEvent.COLLECTION_VIEWED, (data) => {
      console.log('PerfKit - Collection viewed', data);
    });
    subscribe(AnalyticsEvent.SEARCH_VIEWED, (data) => {
      console.log('PerfKit - search viewed', data);
    });
    subscribe(AnalyticsEvent.CART_VIEWED, (data) => {
      console.log('PerfKit - cart viewed', data);
    });

    ready();
  }, [subscribe, ready]);
  return null;
}
