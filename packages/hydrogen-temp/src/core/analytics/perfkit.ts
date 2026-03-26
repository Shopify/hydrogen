import {loadScript} from './utils/load-script';
import {parseGid} from './utils/parse-gid';
import type {ShopAnalytics} from './types';
import {AnalyticsEvent} from './events';

const PERF_KIT_URL =
  'https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-spa.min.js';

type BusDeps = {
  shop: ShopAnalytics;
  subscribe: (event: string, callback: (payload: any) => void) => () => void;
  register: (key: string) => {ready: () => void};
};

export function initPerfKit(deps: BusDeps) {
  const {shop, subscribe, register} = deps;
  const {ready} = register('Internal_Shopify_Perf_Kit');

  loadScript(PERF_KIT_URL, {
    attributes: {
      id: 'perfkit',
      'data-application': 'hydrogen',
      'data-shop-id': parseGid(shop.shopId).id.toString(),
      'data-storefront-id': shop.hydrogenSubchannelId,
      'data-monorail-region': 'global',
      'data-spa-mode': 'true',
      'data-resource-timing-sampling-rate': '100',
    },
  })
    .then(() => {
      subscribe(AnalyticsEvent.PAGE_VIEWED, () => window.PerfKit?.navigate());
      subscribe(AnalyticsEvent.PRODUCT_VIEWED, () =>
        window.PerfKit?.setPageType('product'),
      );
      subscribe(AnalyticsEvent.COLLECTION_VIEWED, () =>
        window.PerfKit?.setPageType('collection'),
      );
      subscribe(AnalyticsEvent.SEARCH_VIEWED, () =>
        window.PerfKit?.setPageType('search'),
      );
      subscribe(AnalyticsEvent.CART_VIEWED, () =>
        window.PerfKit?.setPageType('cart'),
      );
      ready();
    })
    .catch(() => ready());
}
