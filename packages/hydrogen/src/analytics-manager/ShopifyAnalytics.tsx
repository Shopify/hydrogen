import {
  AnalyticsEventName,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  useShopifyCookies,
  type ShopifyPageViewPayload,
} from '@shopify/hydrogen';
import {useAnalyticsProvider} from './AnalyticsProvider';
import type {
  PageViewPayload,
  ProductViewPayload,
  CollectionViewPayload,
  CartViewPayload,
  CartUpdatePayload,
} from './AnalyticsView';
import {useEffect} from 'react';

/**
 * This component is responsible for sending analytics events to Shopify.
 * It emits the following events:
 * - page_viewed
 * - product_viewed
 * - collection_viewed
 * - cart_viewed
 * - cart_updated
 *   - product_added_to_cart
 *   - product_removed_from_cart
 *   - TODO: add more events
 *
*/
export function ShopifyAnalytics() {
  const {subscribe, canTrack} = useAnalyticsProvider();
  useShopifyCookies({hasUserConsent: canTrack()});

  useEffect(() => {
    // Views
    subscribe('page_viewed', pageViewHandler);
    subscribe('product_viewed', productViewHandler);
    subscribe('collection_viewed', collectionViewHandler);
    subscribe('cart_viewed', cartViewHandler);

    // Cart updates
    subscribe('cart_updated', cartUpdateHandler);
  }, [subscribe]);

  return null;
}

function pageViewHandler(payload: PageViewPayload) {
  if (!payload?.shop?.shopId) {
    // eslint-disable-next-line no-console
    console.warn('ShopifyAnalytics - Missing shopId in page view payload');
    return;
  }

  const eventPayload: ShopifyPageViewPayload = {
    ...payload.shop,
    hasUserConsent: true,
    ...getClientBrowserParameters(),
  };

  // eslint-disable-next-line no-console
  console.log('ShopifyAnalytics - Page viewed', eventPayload);

  sendShopifyAnalytics({
    eventName: AnalyticsEventName.PAGE_VIEW,
    payload: eventPayload,
  });
}

function productViewHandler(payload: ProductViewPayload) {
  // eslint-disable-next-line no-console
  console.log('ShopifyAnalytics - Product viewed:', payload);
}

function collectionViewHandler(payload: CollectionViewPayload) {
  // eslint-disable-next-line no-console
  console.log('ShopifyAnalytics - Collection viewed:', payload);
}

function cartViewHandler(payload: CartViewPayload) {
  // eslint-disable-next-line no-console
  console.log('ShopifyAnalytics - Cart viewed:', payload);
}

function cartUpdateHandler(payload: CartUpdatePayload) {
  console.log('ShopifyAnalytics - Cart updated:', payload);
  const {cart, prevCart} = payload;

  // TODO: cleanup and simplify some of this logic using cart.totalCount instead

  // Compare previous cart against current cart lines
  // Detect quantity changes and missing cart lines
  prevCart?.lines?.nodes?.forEach((prevLine) => {
    const matchedLineId = cart?.lines.nodes.filter(
      (line) => prevLine.id === line.id,
    );
    if (matchedLineId?.length === 1) {
      const matchedLine = matchedLineId[0];
      if (prevLine.quantity < matchedLine.quantity) {
        // eslint-disable-next-line no-console
        console.log('ShopifyAnalytics - Added To Cart', {
          prevLine,
          quantity: matchedLine.quantity,
        });
      } else if (prevLine.quantity > matchedLine.quantity) {
        // eslint-disable-next-line no-console
        console.log('ShopifyAnalytics - Removed From Cart', {
          prevLine,
          quantity: matchedLine.quantity,
        });
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('ShopifyAnalytics - Removed From Cart', {
        prevLine,
        quantity: 0,
      });
    }
  });

  // Detect added to cart
  cart?.lines?.nodes?.forEach((line) => {
    const matchedLineId = prevCart?.lines.nodes.filter(
      (previousLine) => line.id === previousLine.id,
    );
    if (!matchedLineId || matchedLineId.length === 0) {
      // eslint-disable-next-line no-console
      console.log('ShopifyAnalytics - Added To Cart', {
        line,
        quantity: 1,
      });
    }
  });
}
