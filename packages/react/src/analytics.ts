import {SHOPIFY_S, SHOPIFY_Y} from './cart-constants.js';
import type {
  ClientBrowserParameters,
  ShopifyAddToCartPayload,
  ShopifyAnalytics,
  ShopifyPageViewPayload,
  ShopifyMonorailEvent,
} from './analytics-types.js';
import {AnalyticsEventName} from './analytics-constants.js';
import {errorIfServer} from './analytics-utils.js';
import {getShopifyCookies} from './cookies-utils.js';

import {pageView as trekkiePageView} from './analytics-schema-trekkie-storefront-page-view.js';
import {
  pageView as customerPageView,
  addToCart as customerAddToCart,
} from './analytics-schema-custom-storefront-customer-tracking.js';

/**
 * Set user and session cookies and refresh the expiry time
 * @param event - The analytics event.
 * @param shopDomain - The Online Store domain to sent Shopify analytics under the same
 *   top level domain.
 */
export function sendShopifyAnalytics(
  event: ShopifyAnalytics,
  shopDomain?: string
): Promise<void> {
  const {eventName, payload} = event;
  if (!payload.hasUserConsent) return Promise.resolve();

  let events: ShopifyMonorailEvent[] = [];

  if (eventName === AnalyticsEventName.PAGE_VIEW) {
    const pageViewPayload = payload as ShopifyPageViewPayload;
    events = events.concat(
      trekkiePageView(pageViewPayload),
      customerPageView(pageViewPayload)
    );
  } else if (eventName === AnalyticsEventName.ADD_TO_CART) {
    events = events.concat(
      customerAddToCart(payload as ShopifyAddToCartPayload)
    );
  }

  if (events.length) {
    return sendToShopify(events, shopDomain);
  } else {
    return Promise.resolve();
  }
}

type MonorailResponse = {
  status: number;
  message: string;
};

const ERROR_MESSAGE = 'sendShopifyAnalytics request is unsuccessful';

function sendToShopify(
  events: ShopifyMonorailEvent[],
  shopDomain?: string
): Promise<void> {
  const eventsToBeSent = {
    events,
    metadata: {
      event_sent_at_ms: Date.now(),
    },
  };

  try {
    return fetch(
      shopDomain
        ? `https://${shopDomain}/.well-known/shopify/monorail/unstable/produce_batch`
        : 'https://monorail-edge.shopifysvc.com/unstable/produce_batch',
      {
        method: 'post',
        headers: {
          'content-type': 'text/plain',
        },
        body: JSON.stringify(eventsToBeSent),
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error('Response failed');
        }
        return response.text();
      })
      .then((data) => {
        if (data) {
          const jsonResponse = JSON.parse(data);
          jsonResponse.result.forEach((eventResponse: MonorailResponse) => {
            if (eventResponse.status !== 200) {
              console.error(ERROR_MESSAGE, '\n\n', eventResponse.message);
            }
          });
        }
      })
      .catch((err) => {
        console.error(ERROR_MESSAGE, err);
        if (__HYDROGEN_DEV__) {
          throw new Error(ERROR_MESSAGE);
        }
      });
  } catch (error) {
    // Do nothing
    return Promise.resolve();
  }
}

export function getClientBrowserParameters(): ClientBrowserParameters {
  if (errorIfServer('getClientBrowserParameters')) {
    return {
      uniqueToken: '',
      visitToken: '',
      url: '',
      path: '',
      search: '',
      referrer: '',
      title: '',
      userAgent: '',
      navigationType: '',
      navigationApi: '',
    };
  }

  const [navigationType, navigationApi] = getNavigationType();
  const cookies = getShopifyCookies(document.cookie);

  return {
    uniqueToken: cookies[SHOPIFY_Y],
    visitToken: cookies[SHOPIFY_S],
    url: location.href,
    path: location.pathname,
    search: location.search,
    referrer: document.referrer,
    title: document.title,
    userAgent: navigator.userAgent,
    navigationType,
    navigationApi,
  };
}

function getNavigationTypeExperimental(): string | undefined {
  try {
    const navigationEntries =
      performance?.getEntriesByType &&
      performance?.getEntriesByType('navigation');

    if (navigationEntries && navigationEntries[0]) {
      // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
      const rawType = (
        window.performance.getEntriesByType(
          'navigation'
        )[0] as PerformanceNavigationTiming
      )['type'];
      const navType = rawType && rawType.toString();

      return navType;
    }
  } catch (err) {
    // Do nothing
  }
  return undefined;
}

function getNavigationTypeLegacy(): string | undefined {
  try {
    if (
      PerformanceNavigation &&
      performance?.navigation?.type !== null &&
      performance?.navigation?.type !== undefined
    ) {
      //  https://developer.mozilla.org/en-US/docs/Web/API/Performance/navigation
      const rawType = performance.navigation.type;
      switch (rawType) {
        case PerformanceNavigation.TYPE_NAVIGATE:
          return 'navigate';
          break;
        case PerformanceNavigation.TYPE_RELOAD:
          return 'reload';
          break;
        case PerformanceNavigation.TYPE_BACK_FORWARD:
          return 'back_forward';
          break;
        default:
          return `unknown: ${rawType}`;
      }
    }
  } catch (err) {
    // do nothing
  }
  return undefined;
}

function getNavigationType(): [string, string] {
  try {
    let navApi = 'PerformanceNavigationTiming';
    let navType = getNavigationTypeExperimental();
    if (!navType) {
      navType = getNavigationTypeLegacy();
      navApi = 'performance.navigation';
    }
    if (navType) {
      return [navType, navApi];
    } else {
      return ['unknown', 'unknown'];
    }
  } catch (err) {
    // do nothing
  }
  return ['error', 'error'];
}
